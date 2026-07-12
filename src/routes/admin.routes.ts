import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import {
  DisputeStatus, PaymentStatus, ProductStatus, RefundStatus, ReportStatus,
  Role, SellerApplicationStatus, TicketStatus
} from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { sellerReviewSchema } from "../schemas/seller.schemas.js";
import {
  listSellerApplications,
  reviewSellerApplication
} from "../services/seller.service.js";
import { listUsersForAdministration, updateUserRole } from "../services/user.service.js";
import { prisma } from "../lib/prisma.js";
import { completePayment, issueRefund } from "../services/payment.service.js";
import { releaseAvailableSellerEarnings, reviewWithdrawalRequest } from "../services/finance.service.js";
import { autoResolveExpiredDisputes, markDisputeTurn } from "../services/dispute.service.js";
import { ensureDefaultMarketplaceCategories } from "../services/category.service.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import { privateUploadRoot } from "../middleware/upload.js";

export const adminRouter = Router();

const requireStaff = requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN);
const requireAdmin = requireRole(Role.ADMIN, Role.SUPER_ADMIN);

adminRouter.use(requireAuth, requireVerifiedUser);

adminRouter.get("/seller-applications", requireStaff, asyncHandler(async (req, res) => {
  const querySchema = z.object({
    status: z.nativeEnum(SellerApplicationStatus).optional()
  });
  const query = querySchema.parse(req.query);
  const applications = await listSellerApplications(query.status);

  res.json({ applications });
}));

adminRouter.patch("/seller-applications/:id", requireStaff, asyncHandler(async (req, res) => {
  const input = sellerReviewSchema.parse(req.body);
  const applicationId = z.string().uuid().parse(req.params.id);
  const application = await reviewSellerApplication(
    applicationId,
    req.auth!.id,
    input.status,
    input.adminNotes
  );

  res.json({
    message: "Seller application reviewed successfully.",
    application
  });
}));

adminRouter.get("/seller-applications/:id/documents/:side", requireStaff, asyncHandler(async (req, res) => {
  const applicationId = z.string().uuid().parse(req.params.id);
  const side = z.enum(["front", "back"]).parse(req.params.side);
  const application = await (prisma.sellerApplication as any).findUnique({
    where: { id: applicationId },
    select: {
      documentFrontPath: true,
      documentFrontOriginalName: true,
      documentBackPath: true,
      documentBackOriginalName: true
    }
  });

  if (!application) {
    throw new ApiError(404, "Seller application not found.", "APPLICATION_NOT_FOUND");
  }

  const storagePath = side === "front" ? application.documentFrontPath : application.documentBackPath;
  const originalName = side === "front" ? application.documentFrontOriginalName : application.documentBackOriginalName;

  if (!storagePath) {
    throw new ApiError(404, "Document upload not found for this application.", "DOCUMENT_NOT_FOUND");
  }

  const resolvedPath = path.resolve(storagePath);
  const resolvedPrivateRoot = path.resolve(privateUploadRoot);
  if (!resolvedPath.startsWith(`${resolvedPrivateRoot}${path.sep}`)) {
    throw new ApiError(403, "Document path is outside private uploads.", "DOCUMENT_PATH_INVALID");
  }

  try {
    await fs.access(resolvedPath);
  } catch {
    throw new ApiError(404, "Document file is missing from private storage.", "DOCUMENT_FILE_MISSING");
  }

  res.download(resolvedPath, originalName ?? `seller-document-${side}`);
}));

adminRouter.get(
  "/users",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await listUsersForAdministration();
    res.json({
      users: users.map((user) => ({
        ...user,
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: undefined
      }))
    });
  })
);

adminRouter.patch(
  "/users/:id/role",
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
    const userId = z.string().uuid().parse(req.params.id);
    const user = await updateUserRole(req.auth!.id, userId, input.role);
    res.json({ message: "User role updated successfully.", user });
  })
);

adminRouter.get("/overview", requireStaff, asyncHandler(async (_req, res) => {
  const [pendingSellers, pendingProducts, openTickets, openDisputes, refundRequests, awaitingPayments, pendingDeposits, pendingWithdrawals, users, orders] = await Promise.all([
    prisma.sellerApplication.count({ where: { status: SellerApplicationStatus.PENDING } }),
    prisma.product.count({ where: { status: ProductStatus.PENDING } }),
    prisma.ticket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.PENDING] } } }),
    prisma.dispute.count({ where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW, DisputeStatus.AWAITING_BUYER, DisputeStatus.AWAITING_SELLER] } } }),
    prisma.refund.count({ where: { status: RefundStatus.REQUESTED } }),
    prisma.payment.count({ where: { status: PaymentStatus.REQUIRES_ACTION } }),
    prisma.walletDeposit.count({ where: { status: "PENDING" } }),
    (prisma as any).withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count(), prisma.order.count()
  ]);
  res.json({ overview: { pendingSellers, pendingProducts, openTickets, openDisputes, refundRequests, awaitingPayments, pendingDeposits, pendingWithdrawals, users, orders } });
}));

adminRouter.patch("/users/:id/suspension", requireAdmin, asyncHandler(async (req, res) => {
  const userId = z.string().uuid().parse(req.params.id);
  const input = z.object({ suspended: z.boolean(), reason: z.string().trim().max(1000).optional() }).parse(req.body);
  if (userId === req.auth!.id && input.suspended) {
    res.status(400).json({ message: "You cannot suspend your own account.", code: "SELF_SUSPENSION" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: input.suspended, suspensionReason: input.suspended ? input.reason : null, suspendedAt: input.suspended ? new Date() : null }
  });
  if (input.suspended) await prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  res.json({ user });
}));

adminRouter.patch("/sellers/:userId/suspension", requireAdmin, asyncHandler(async (req, res) => {
  const userId = z.string().uuid().parse(req.params.userId);
  const input = z.object({ suspended: z.boolean(), reason: z.string().trim().max(1000).optional() }).parse(req.body);
  const seller = await prisma.sellerProfile.update({
    where: { userId },
    data: { isSuspended: input.suspended, suspensionReason: input.suspended ? input.reason : null }
  });
  res.json({ seller });
}));

adminRouter.get("/products", requireStaff, asyncHandler(async (req, res) => {
  const status = z.nativeEnum(ProductStatus).optional().parse(req.query.status);
  const products = await prisma.product.findMany({
    where: status ? { status } : undefined, orderBy: { createdAt: "desc" },
    include: { category: true, seller: { select: { id: true, email: true, username: true, sellerProfile: true } }, files: true, inventoryItems: { select: { id: true, deliveredAt: true, isActive: true } } }
  });
  res.json({ products });
}));

adminRouter.patch("/products/:id/status", requireStaff, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ status: z.enum(["APPROVED", "REJECTED", "REMOVED"]), reason: z.string().trim().max(2000).optional() }).parse(req.body);
  if (input.status !== "APPROVED" && !input.reason) {
    res.status(400).json({ message: "A moderation reason is required.", code: "REASON_REQUIRED" }); return;
  }
  if (input.status === "APPROVED") {
    const productForApproval = await prisma.product.findUnique({
      where: { id },
      include: { files: { where: { isActive: true } }, inventoryItems: { where: { isActive: true, orderItemId: null }, select: { id: true } } }
    });
    if (!productForApproval) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    if (productForApproval.type === "DOWNLOAD" && productForApproval.files.length === 0 && productForApproval.inventoryItems.length === 0) {
      throw new ApiError(400, "Add at least one delivery file or inventory row before approving this digital product.", "PRODUCT_DELIVERY_REQUIRED");
    }
  }
  const product = await prisma.product.update({
    where: { id },
    data: { status: input.status, rejectionReason: input.status === "APPROVED" ? null : input.reason, publishedAt: input.status === "APPROVED" ? new Date() : undefined }
  });
  res.json({ product });
}));

adminRouter.get("/orders", requireStaff, asyncHandler(async (req, res) => {
  const take = z.coerce.number().int().min(1).max(500).default(100).parse(req.query.take);
  const orders = await prisma.order.findMany({
    take, orderBy: { createdAt: "desc" },
    include: { buyer: { select: { firstName: true, lastName: true, email: true } }, payment: true, items: true }
  });
  res.json({ orders });
}));

adminRouter.post("/payments/:id/approve", requireAdmin, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) { res.status(404).json({ message: "Payment not found.", code: "PAYMENT_NOT_FOUND" }); return; }
  if (!["BANK_TRANSFER", "CRYPTO", "MANUAL"].includes(payment.method)) {
    res.status(400).json({ message: "Hosted provider payments must be confirmed by the provider.", code: "PROVIDER_CONFIRMATION_REQUIRED" }); return;
  }
  const order = await completePayment(payment.orderId, req.auth!.id);
  res.json({ order });
}));

adminRouter.get("/wallet-deposits", requireStaff, asyncHandler(async (_req, res) => {
  const deposits = await prisma.walletDeposit.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, balanceCents: true } } }
  });
  res.json({ deposits });
}));

adminRouter.patch("/wallet-deposits/:id/approve", requireAdmin, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const deposit = await prisma.walletDeposit.findUnique({ where: { id } });
  if (!deposit) throw new ApiError(404, "Deposit not found.", "DEPOSIT_NOT_FOUND");
  if (deposit.status !== "PENDING") throw new ApiError(400, "Deposit is not pending.", "DEPOSIT_NOT_PENDING");

  const [updated] = await prisma.$transaction([
    prisma.walletDeposit.update({
      where: { id },
      data: { status: "COMPLETED", adminNotes: "Approved by admin." }
    }),
    prisma.user.update({
      where: { id: deposit.userId },
      data: { balanceCents: { increment: deposit.amountCents } }
    })
  ]);

  res.json({ message: "Deposit approved and user balance updated.", deposit: updated });
}));

adminRouter.patch("/wallet-deposits/:id/reject", requireAdmin, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ adminNotes: z.string().trim().max(1000).optional() }).parse(req.body);
  const deposit = await prisma.walletDeposit.findUnique({ where: { id } });
  if (!deposit) throw new ApiError(404, "Deposit not found.", "DEPOSIT_NOT_FOUND");
  if (deposit.status !== "PENDING") throw new ApiError(400, "Deposit is not pending.", "DEPOSIT_NOT_PENDING");

  const updated = await prisma.walletDeposit.update({
    where: { id },
    data: { status: "REJECTED", adminNotes: input.adminNotes ?? "Rejected by admin." }
  });

  res.json({ message: "Deposit rejected.", deposit: updated });
}));

adminRouter.get("/withdrawals", requireStaff, asyncHandler(async (_req, res) => {
  await releaseAvailableSellerEarnings();
  const withdrawals = await (prisma as any).withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, balanceCents: true, role: true } } }
  });
  res.json({ withdrawals });
}));

adminRouter.patch("/withdrawals/:id/:action", requireAdmin, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const action = z.enum(["approve", "reject"]).parse(req.params.action);
  const input = z.object({ adminNotes: z.string().trim().max(1000).optional() }).parse(req.body);
  const withdrawal = await reviewWithdrawalRequest(id, action, input.adminNotes);
  res.json({ message: action === "approve" ? "Withdrawal approved and marked successful." : "Withdrawal rejected and balance returned.", withdrawal });
}));

adminRouter.get("/refunds", requireStaff, asyncHandler(async (_req, res) => {
  const refunds = await prisma.refund.findMany({ orderBy: { createdAt: "desc" }, include: { order: { include: { payment: true } }, requestedBy: { select: { email: true, firstName: true, lastName: true } } } });
  res.json({ refunds });
}));

adminRouter.patch("/refunds/:id", requireAdmin, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ status: z.nativeEnum(RefundStatus), adminNotes: z.string().trim().max(2000).optional(), providerReference: z.string().trim().max(300).optional() }).parse(req.body);
  if (input.status === RefundStatus.COMPLETED) {
    const refund = await issueRefund(id);
    res.json({ refund });
    return;
  }
  const refundIsResolved = input.status === RefundStatus.REJECTED;
  const refund = await prisma.refund.update({ where: { id }, data: { ...input, resolvedAt: refundIsResolved ? new Date() : undefined } });
  res.json({ refund });
}));

adminRouter.get("/disputes", requireStaff, asyncHandler(async (_req, res) => {
  await autoResolveExpiredDisputes();
  const disputes = await prisma.dispute.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      order: { include: { buyer: { select: { firstName: true, lastName: true, email: true } }, items: { include: { product: { select: { name: true, slug: true } }, seller: { select: { firstName: true, lastName: true, email: true } } } } } },
      orderItem: { include: { product: { select: { name: true, slug: true } }, seller: { select: { firstName: true, lastName: true, email: true } } } },
      openedBy: { select: { email: true, firstName: true, lastName: true } }
    }
  });
  res.json({ disputes });
}));

adminRouter.patch("/disputes/:id", requireStaff, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ status: z.nativeEnum(DisputeStatus), resolution: z.string().trim().max(4000).optional() }).parse(req.body);
  const resolved = input.status === DisputeStatus.RESOLVED_BUYER || input.status === DisputeStatus.RESOLVED_SELLER || input.status === DisputeStatus.CLOSED;
  const closedInFavorOf = input.status === DisputeStatus.RESOLVED_BUYER ? "BUYER" : input.status === DisputeStatus.RESOLVED_SELLER ? "SELLER" : undefined;
  const dispute = await prisma.dispute.update({ where: { id }, data: { ...input, closedInFavorOf, awaitingParty: resolved ? null : undefined, autoCloseAt: resolved ? null : undefined, resolvedAt: resolved ? new Date() : null } });
  res.json({ dispute });
}));

adminRouter.post("/disputes/:id/message", requireStaff, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const dispute = await prisma.dispute.findUnique({ where: { id }, include: { order: { include: { items: { select: { sellerId: true } } } } } });
  if (!dispute) throw new ApiError(404, "Dispute not found.", "DISPUTE_NOT_FOUND");
  const message = await prisma.orderMessage.create({ data: { orderId: dispute.orderId, authorId: req.auth!.id, body: input.body }, include: { author: { select: { firstName: true, role: true } } } });
  await markDisputeTurn(dispute.orderId, { id: req.auth!.id, role: req.auth!.role as Role }, dispute.order.buyerId, [...new Set(dispute.order.items.map((item) => item.sellerId))]);
  res.status(201).json({ message });
}));

adminRouter.get("/tickets", requireStaff, asyncHandler(async (_req, res) => {
  const tickets = await prisma.ticket.findMany({ orderBy: { updatedAt: "desc" }, include: { creator: { select: { firstName: true, lastName: true, email: true } }, messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { firstName: true, role: true } } } } } });
  res.json({ tickets });
}));

adminRouter.post("/tickets/:id/reply", requireStaff, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ body: z.string().trim().min(1).max(4000), status: z.nativeEnum(TicketStatus).default(TicketStatus.PENDING), isInternal: z.boolean().default(false) }).parse(req.body);
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: { creator: true } });
  if (!ticket) { res.status(404).json({ message: "Ticket not found.", code: "TICKET_NOT_FOUND" }); return; }
  const message = await prisma.ticketMessage.create({ data: { ticketId: id, authorId: req.auth!.id, body: input.body, isInternal: input.isInternal } });
  await prisma.ticket.update({ where: { id }, data: { status: input.status, assigneeId: req.auth!.id } });
  if (!input.isInternal) await sendTicketUpdateEmail(ticket.creator.email, ticket.ticketNumber, ticket.subject, input.status);
  res.status(201).json({ message });
}));

adminRouter.get("/categories", requireStaff, asyncHandler(async (_req, res) => {
  await ensureDefaultMarketplaceCategories();
  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  res.json({ categories });
}));

adminRouter.post("/categories", requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100).optional(), description: z.string().trim().min(12).max(4000), parentId: z.string().uuid().nullable().optional(), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(), sortOrder: z.coerce.number().int().min(0).max(10000).default(0) }).parse(req.body);
  if (input.parentId) {
    const parent = await prisma.category.findFirst({ where: { id: input.parentId, parentId: null }, select: { id: true } });
    if (!parent) { res.status(400).json({ message: "Choose a valid parent category.", code: "INVALID_PARENT_CATEGORY" }); return; }
  }
  const base = (input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category").slice(0, 90);
  let slug = base;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${suffix++}`;
  const category = await prisma.category.create({ data: { ...input, slug, seoTitle: input.seoTitle || input.name, seoDescription: input.seoDescription || input.description.slice(0, 170), isActive: true } });
  res.status(201).json({ category });
}));

adminRouter.patch("/categories/:id", requireAdmin, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ name: z.string().trim().min(2).max(100).optional(), description: z.string().trim().min(12).max(4000).optional(), parentId: z.string().uuid().nullable().optional(), isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).max(10000).optional() }).parse(req.body);
  if (input.parentId === id) { res.status(400).json({ message: "A category cannot be its own parent.", code: "INVALID_PARENT_CATEGORY" }); return; }
  const category = await prisma.category.update({ where: { id }, data: input });
  res.json({ category });
}));

adminRouter.get("/coupons", requireStaff, asyncHandler(async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ coupons });
}));

adminRouter.post("/coupons", requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({ code: z.string().trim().min(3).max(40), description: z.string().trim().max(500).optional(), percentOff: z.number().int().min(1).max(100).optional(), amountOffCents: z.number().int().positive().optional(), minimumCents: z.number().int().min(0).default(0), maxRedemptions: z.number().int().positive().optional(), expiresAt: z.coerce.date().optional() }).refine((value) => Boolean(value.percentOff) !== Boolean(value.amountOffCents), "Choose either percentage or fixed discount.").parse(req.body);
  const coupon = await prisma.coupon.create({ data: { ...input, code: input.code.toUpperCase() } });
  res.status(201).json({ coupon });
}));

adminRouter.get("/homepage", requireStaff, asyncHandler(async (_req, res) => {
  const sections = await prisma.homepageSection.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ sections });
}));

adminRouter.put("/homepage/:key", requireAdmin, asyncHandler(async (req, res) => {
  const key = z.string().regex(/^[a-z0-9-]+$/).max(80).parse(req.params.key);
  const input = z.object({ title: z.string().trim().min(2).max(160), subtitle: z.string().trim().max(300).nullable().optional(), body: z.string().trim().max(4000).nullable().optional(), imageUrl: z.string().url().nullable().optional(), ctaLabel: z.string().trim().max(60).nullable().optional(), ctaUrl: z.string().trim().max(300).nullable().optional(), isVisible: z.boolean().default(true), sortOrder: z.number().int().min(0).max(10000).default(0) }).parse(req.body);
  const section = await prisma.homepageSection.upsert({ where: { key }, create: { key, ...input }, update: input });
  res.json({ section });
}));

adminRouter.get("/reports", requireStaff, asyncHandler(async (_req, res) => {
  const reports = await prisma.productReport.findMany({ orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, slug: true, status: true } }, reporter: { select: { email: true } } } });
  res.json({ reports });
}));

adminRouter.patch("/reports/:id", requireStaff, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ status: z.nativeEnum(ReportStatus), adminNotes: z.string().trim().max(2000).optional(), removeProduct: z.boolean().default(false) }).parse(req.body);
  const report = await prisma.productReport.update({ where: { id }, data: { status: input.status, adminNotes: input.adminNotes } });
  if (input.removeProduct) await prisma.product.update({ where: { id: report.productId }, data: { status: ProductStatus.REMOVED, rejectionReason: input.adminNotes ?? "Removed after a trust and safety report." } });
  res.json({ report });
}));

adminRouter.patch("/reviews/:id/moderation", requireStaff, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ isVisible: z.boolean(), moderationNote: z.string().trim().max(1000).optional() }).parse(req.body);
  const review = await prisma.review.update({ where: { id }, data: input });
  res.json({ review });
}));

adminRouter.get("/reviews", requireStaff, asyncHandler(async (_req, res) => {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, slug: true } },
      buyer: { select: { firstName: true, lastName: true, email: true } }
    }
  });
  res.json({ reviews });
}));

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

adminRouter.get("/export/orders.csv", requireAdmin, asyncHandler(async (_req, res) => {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { payment: true } });
  const rows = [
    ["order_number", "invoice_number", "date", "buyer_email", "status", "payment_method", "subtotal", "discount", "total", "currency"],
    ...orders.map((order) => [order.orderNumber, order.invoiceNumber, order.createdAt.toISOString(), order.buyerEmail, order.status, order.payment?.method, (order.subtotalCents / 100).toFixed(2), (order.discountCents / 100).toFixed(2), (order.totalCents / 100).toFixed(2), order.currency])
  ];
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="hsello-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(rows.map((row) => row.map(csvCell).join(",")).join("\n"));
}));
