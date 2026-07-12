import path from "node:path";
import { Router } from "express";
import { DisputeStatus, PaymentMethod, ProductType, TicketCategory, Role } from "@prisma/client";
import { z } from "zod";
import { sha256 } from "../lib/crypto.js";
import { env } from "../config/env.js";
import { createZipBuffer } from "../lib/zip.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { imageUpload, publicUploadUrl } from "../middleware/upload.js";
import { activeDisputeWhere, autoResolveExpiredDisputes, markDisputeTurn, responseDeadline } from "../services/dispute.service.js";
import { availablePaymentMethods, checkCryptoPayment, confirmCryptoWebhook, confirmHostedPayment, createCheckout, getPaymentStatusForBuyer } from "../services/payment.service.js";

export const commerceRouter = Router();

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  method: z.nativeEnum(PaymentMethod),
  couponCode: z.string().trim().max(40).optional()
});

const activeDisputeStatuses = new Set<DisputeStatus>([
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.AWAITING_BUYER,
  DisputeStatus.AWAITING_SELLER
]);

type OrderForDisputeWindow = {
  paidAt: Date | null;
  createdAt: Date;
  disputes?: Array<{ status: DisputeStatus }>;
  items: Array<{ product: { afterSalesServiceHours?: number | null } }>;
};

function getDisputeWindow(order: OrderForDisputeWindow) {
  const windowHours = Math.max(
    12,
    ...order.items.map((item) => item.product.afterSalesServiceHours ?? 12)
  );
  const startsAt = order.paidAt ?? order.createdAt;
  const deadline = new Date(startsAt.getTime() + windowHours * 60 * 60 * 1000);
  const hasActiveDispute = Boolean(order.disputes?.some((dispute) => activeDisputeStatuses.has(dispute.status)));
  return {
    disputeWindowHours: windowHours,
    disputeDeadline: deadline.toISOString(),
    canOpenDispute: Boolean(order.paidAt) && !hasActiveDispute && Date.now() <= deadline.getTime()
  };
}

function withDisputeWindow<T extends OrderForDisputeWindow>(order: T) {
  return { ...order, ...getDisputeWindow(order) };
}

commerceRouter.get("/payment-methods", (_req, res) => res.json({ methods: availablePaymentMethods() }));

commerceRouter.post("/crypto/webhook", asyncHandler(async (req, res) => {
  const providedSecret = req.get("x-hsello-crypto-secret") || z.string().optional().parse(req.body?.secret);
  if (!env.CRYPTO_WEBHOOK_SECRET || providedSecret !== env.CRYPTO_WEBHOOK_SECRET) {
    throw new ApiError(401, "Crypto webhook authentication failed.", "CRYPTO_WEBHOOK_UNAUTHORIZED");
  }
  const input = z.object({
    orderId: z.string().uuid().optional(),
    providerReference: z.string().trim().min(3).max(160).optional(),
    txHash: z.string().trim().max(200).optional(),
    amount: z.string().trim().max(80).optional(),
    asset: z.string().trim().max(40).optional(),
    network: z.string().trim().max(80).optional()
  }).refine((value) => value.orderId || value.providerReference, "Provide orderId or providerReference.").parse(req.body);
  const order = await confirmCryptoWebhook(input);
  res.json({ order });
}));


commerceRouter.get("/download/token/:token", asyncHandler(async (req, res) => {
  const token = z.string().min(20).max(200).parse(req.params.token);
  const grant = await prisma.downloadGrant.findUnique({
    where: { tokenHash: sha256(token) },
    include: { productFile: true }
  });
  if (!grant || grant.revokedAt || grant.expiresAt <= new Date() || grant.downloadCount >= grant.maxDownloads) {
    throw new ApiError(410, "This download link is expired or has reached its limit.", "DOWNLOAD_UNAVAILABLE");
  }
  await prisma.$transaction([
    prisma.downloadGrant.update({ where: { id: grant.id }, data: { downloadCount: { increment: 1 } } }),
    prisma.downloadEvent.create({ data: { downloadGrantId: grant.id, ipAddress: req.ip, userAgent: req.get("user-agent") } })
  ]);
  res.download(path.resolve(grant.productFile.storagePath), grant.productFile.displayName);
}));

commerceRouter.use(requireAuth, requireVerifiedUser);

commerceRouter.post("/checkout", asyncHandler(async (req, res) => {
  const input = checkoutSchema.parse(req.body);
  const result = await createCheckout(req.auth!.id, input.items, input.method, input.couponCode);
  res.status(201).json(result);
}));

commerceRouter.post("/checkout/:orderId/confirm", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.orderId);
  const order = await confirmHostedPayment(orderId, req.auth!.id);
  res.json({ order });
}));

commerceRouter.get("/checkout/:orderId/status", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.orderId);
  const status = await getPaymentStatusForBuyer(orderId, req.auth!.id);
  res.json(status);
}));

commerceRouter.post("/checkout/:orderId/check-crypto", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.orderId);
  const status = await checkCryptoPayment(orderId, req.auth!.id);
  res.json(status);
}));

commerceRouter.get("/disputes", asyncHandler(async (req, res) => {
  await autoResolveExpiredDisputes({ OR: [{ openedById: req.auth!.id }, { order: { buyerId: req.auth!.id } }] });
  const disputes = await prisma.dispute.findMany({
    where: { OR: [{ openedById: req.auth!.id }, { order: { buyerId: req.auth!.id } }] },
    orderBy: { updatedAt: "desc" },
    include: {
      order: { include: { items: { include: { product: { select: { name: true, slug: true, coverImageUrl: true } } } } } },
      orderItem: { include: { product: { select: { name: true, slug: true, coverImageUrl: true } } } },
      openedBy: { select: { firstName: true, lastName: true, email: true } }
    }
  });
  res.json({ disputes });
}));

commerceRouter.get("/chats", asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: req.auth!.id, messages: { some: {} } },
    orderBy: { updatedAt: "desc" },
    include: {
      items: { take: 3, include: { product: { select: { slug: true, coverImageUrl: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { firstName: true, role: true } } } },
      disputes: { where: activeDisputeWhere(), take: 1 }
    }
  });
  res.json({ chats: orders });
}));

commerceRouter.get("/orders", asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: req.auth!.id }, orderBy: { createdAt: "desc" },
    include: {
      payment: true,
      items: {
        include: {
          product: { select: { slug: true, type: true, coverImageUrl: true, afterSalesServiceHours: true } },
          downloadGrants: { include: { productFile: true } },
          inventoryItems: { where: { deliveredAt: { not: null } }, select: { id: true, content: true, source: true, deliveredAt: true } }
        }
      },
      refunds: { orderBy: { createdAt: "desc" }, take: 1 },
      disputes: { orderBy: { createdAt: "desc" }, take: 3 }
    }
  });
  res.json({ orders: orders.map(withDisputeWindow) });
}));

commerceRouter.get("/orders/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await autoResolveExpiredDisputes({ orderId: id });
  const order = await prisma.order.findFirst({
    where: { id, OR: [{ buyerId: req.auth!.id }, { items: { some: { sellerId: req.auth!.id } } }] },
    include: {
      buyer: { select: { firstName: true, lastName: true, email: true } },
      payment: true,
      items: {
        include: {
          product: { select: { slug: true, type: true, coverImageUrl: true, afterSalesServiceHours: true, deliveryNote: true } },
          downloadGrants: { include: { productFile: true } },
          inventoryItems: { where: { deliveredAt: { not: null } }, select: { id: true, content: true, source: true, deliveredAt: true } }
        }
      },
      refunds: { orderBy: { createdAt: "desc" }, take: 3 },
      disputes: { orderBy: { createdAt: "desc" }, take: 3 }
    }
  });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  res.json({ order: withDisputeWindow(order) });
}));

commerceRouter.get("/orders/:id/invoice", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const order = await prisma.order.findFirst({ where: { id, buyerId: req.auth!.id }, include: { items: true, payment: true } });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="${order.invoiceNumber}.html"`);
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${order.invoiceNumber}</title><style>body{font:14px Arial;max-width:760px;margin:40px auto;color:#17202a}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-size:20px}</style></head><body><h1>HSello invoice</h1><p><strong>${order.invoiceNumber}</strong><br>Order ${order.orderNumber}<br>${order.createdAt.toISOString().slice(0,10)}</p><p>Bill to: ${order.buyerName} &lt;${order.buyerEmail}&gt;</p><table><tr><th>Item</th><th>Qty</th><th>Total</th></tr>${order.items.map((item) => `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>$${(item.totalCents/100).toFixed(2)}</td></tr>`).join("")}</table><p class="total">Total: <strong>$${(order.totalCents/100).toFixed(2)} ${order.currency}</strong></p></body></html>`);
}));

commerceRouter.get("/downloads/:grantId", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.grantId);
  const grant = await prisma.downloadGrant.findFirst({
    where: { id, orderItem: { order: { buyerId: req.auth!.id } } }, include: { productFile: true }
  });
  if (!grant || grant.revokedAt || grant.expiresAt <= new Date() || grant.downloadCount >= grant.maxDownloads) {
    throw new ApiError(410, "This download is expired or has reached its limit.", "DOWNLOAD_UNAVAILABLE");
  }
  await prisma.$transaction([
    prisma.downloadGrant.update({ where: { id }, data: { downloadCount: { increment: 1 } } }),
    prisma.downloadEvent.create({ data: { downloadGrantId: id, ipAddress: req.ip, userAgent: req.get("user-agent") } })
  ]);
  res.download(path.resolve(grant.productFile.storagePath), grant.productFile.displayName);
}));

commerceRouter.get("/order-items/:id/download.zip", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const orderItem = await prisma.orderItem.findFirst({
    where: { id, order: { buyerId: req.auth!.id, paidAt: { not: null } } },
    include: {
      downloadGrants: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        include: { productFile: true }
      }
    }
  });

  const grants = orderItem?.downloadGrants.filter((grant) => grant.downloadCount < grant.maxDownloads) ?? [];
  if (!orderItem || grants.length === 0) {
    throw new ApiError(410, "No downloadable files are available for this order item.", "DOWNLOAD_UNAVAILABLE");
  }

  const zip = await createZipBuffer(grants.map((grant) => ({
    name: grant.productFile.displayName,
    storagePath: grant.productFile.storagePath
  })));

  await prisma.$transaction(grants.flatMap((grant) => [
    prisma.downloadGrant.update({ where: { id: grant.id }, data: { downloadCount: { increment: 1 } } }),
    prisma.downloadEvent.create({ data: { downloadGrantId: grant.id, ipAddress: req.ip, userAgent: req.get("user-agent") } })
  ]));

  res.setHeader("content-type", "application/zip");
  res.setHeader("content-disposition", `attachment; filename="${orderItem.productName.replace(/[^a-z0-9-]+/gi, "-").slice(0, 80) || "hsello-download"}.zip"`);
  res.send(zip);
}));

commerceRouter.post("/orders/:id/refunds", requireRole(Role.CUSTOMER), asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const input = z.object({ reason: z.string().trim().min(20).max(2000), amountCents: z.number().int().positive().optional() }).parse(req.body);
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: req.auth!.id } });
  if (!order || !order.paidAt) throw new ApiError(400, "Only paid orders can be refunded.", "REFUND_NOT_ALLOWED");
  const refund = await prisma.refund.create({ data: { orderId, requestedById: req.auth!.id, reason: input.reason, amountCents: Math.min(input.amountCents ?? order.totalCents, order.totalCents) } });
  res.status(201).json({ refund });
}));

commerceRouter.post("/orders/:id/disputes", requireRole(Role.CUSTOMER), asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const input = z.object({ subject: z.string().trim().min(5).max(140), description: z.string().trim().min(20).max(4000), orderItemId: z.string().uuid().optional(), demandRefund: z.boolean().default(false) }).parse(req.body);
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: req.auth!.id },
    include: {
      items: { include: { product: { select: { afterSalesServiceHours: true } } } },
      disputes: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  if (!order.paidAt) throw new ApiError(400, "Only paid orders can be disputed.", "DISPUTE_PAYMENT_REQUIRED");
  const window = getDisputeWindow(order);
  if (order.disputes.some((dispute) => activeDisputeStatuses.has(dispute.status))) {
    throw new ApiError(409, "This order already has an active dispute.", "DISPUTE_ALREADY_OPEN");
  }
  if (!window.canOpenDispute) {
    throw new ApiError(400, `The dispute window closed on ${new Date(window.disputeDeadline).toLocaleString()}.`, "DISPUTE_WINDOW_CLOSED");
  }
  const orderItemId = input.orderItemId && order.items.some((item) => item.id === input.orderItemId) ? input.orderItemId : order.items[0]?.id;
  const dispute = await prisma.dispute.create({
    data: {
      orderId,
      orderItemId,
      openedById: req.auth!.id,
      subject: input.subject,
      description: input.description,
      refundDemanded: input.demandRefund,
      awaitingParty: "SELLER",
      autoCloseAt: responseDeadline(),
      lastBuyerMessageAt: new Date()
    }
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "DISPUTED" } });
  if (input.demandRefund) {
    await prisma.refund.create({ data: { orderId, requestedById: req.auth!.id, reason: `Refund demanded through dispute: ${input.description}`, amountCents: order.totalCents } }).catch(() => undefined);
  }
  res.status(201).json({ dispute });
}));

commerceRouter.post("/disputes/:id/close", requireRole(Role.CUSTOMER), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ resolution: z.string().trim().max(1000).optional() }).parse(req.body);
  const dispute = await prisma.dispute.findFirst({ where: { id, OR: [{ openedById: req.auth!.id }, { order: { buyerId: req.auth!.id } }] }, include: { order: true } });
  if (!dispute) throw new ApiError(404, "Dispute not found.", "DISPUTE_NOT_FOUND");
  const updated = await prisma.dispute.update({ where: { id }, data: { status: DisputeStatus.CLOSED, resolution: input.resolution ?? "Closed by buyer.", resolvedAt: new Date(), awaitingParty: null, autoCloseAt: null } });
  res.json({ dispute: updated });
}));

commerceRouter.post("/disputes/:id/refund", requireRole(Role.CUSTOMER), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ reason: z.string().trim().min(10).max(2000).optional(), amountCents: z.number().int().positive().optional() }).parse(req.body);
  const dispute = await prisma.dispute.findFirst({ where: { id, OR: [{ openedById: req.auth!.id }, { order: { buyerId: req.auth!.id } }] }, include: { order: true } });
  if (!dispute?.order.paidAt) throw new ApiError(400, "Only paid disputed orders can request a refund.", "REFUND_NOT_ALLOWED");
  const refund = await prisma.refund.create({ data: { orderId: dispute.orderId, requestedById: req.auth!.id, reason: input.reason ?? `Refund demanded for dispute ${dispute.subject}`, amountCents: Math.min(input.amountCents ?? dispute.order.totalCents, dispute.order.totalCents) } });
  const updated = await prisma.dispute.update({ where: { id }, data: { refundDemanded: true, status: DisputeStatus.UNDER_REVIEW, awaitingParty: null, autoCloseAt: null } });
  res.status(201).json({ refund, dispute: updated });
}));

commerceRouter.get("/orders/:id/messages", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const order = await prisma.order.findFirst({ where: { id: orderId, OR: [{ buyerId: req.auth!.id }, { items: { some: { sellerId: req.auth!.id } } }] } });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  const messages = await prisma.orderMessage.findMany({ where: { orderId }, orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, firstName: true, role: true } } } });
  res.json({ messages });
}));

commerceRouter.post("/orders/:id/messages", imageUpload.single("attachment"), asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const order = await prisma.order.findFirst({
    where: { id: orderId, OR: [{ buyerId: req.auth!.id }, { items: { some: { sellerId: req.auth!.id } } }] },
    include: { items: { select: { sellerId: true } } }
  });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  const message = await prisma.orderMessage.create({
    data: {
      orderId,
      authorId: req.auth!.id,
      body,
      attachmentUrl: req.file ? publicUploadUrl(req.file.filename) : undefined,
      attachmentName: req.file?.originalname,
      attachmentMimeType: req.file?.mimetype
    },
    include: { author: { select: { id: true, firstName: true, role: true } } }
  });
  await markDisputeTurn(orderId, { id: req.auth!.id, role: req.auth!.role as Role }, order.buyerId, [...new Set(order.items.map((item) => String(item.sellerId)))]);
  res.status(201).json({ message });
}));

commerceRouter.get("/tickets", asyncHandler(async (req, res) => {
  const tickets = await prisma.ticket.findMany({ where: { creatorId: req.auth!.id }, orderBy: { updatedAt: "desc" }, include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { firstName: true, role: true } } } } } });
  res.json({ tickets });
}));

commerceRouter.post("/tickets", asyncHandler(async (req, res) => {
  const input = z.object({ category: z.nativeEnum(TicketCategory), subject: z.string().trim().min(5).max(140), body: z.string().trim().min(10).max(4000), orderId: z.string().uuid().optional() }).parse(req.body);
  if (input.orderId) {
    const order = await prisma.order.findFirst({ where: { id: input.orderId, buyerId: req.auth!.id } });
    if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  }
  const ticket = await prisma.ticket.create({
    data: { ticketNumber: `TK-${Date.now().toString(36).toUpperCase()}`, creatorId: req.auth!.id, orderId: input.orderId, category: input.category, subject: input.subject, messages: { create: { authorId: req.auth!.id, body: input.body } } },
    include: { messages: true }
  });
  res.status(201).json({ ticket });
}));

commerceRouter.post("/tickets/:id/messages", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const ticket = await prisma.ticket.findFirst({ where: { id, creatorId: req.auth!.id }, include: { creator: true } });
  if (!ticket) throw new ApiError(404, "Ticket not found.", "TICKET_NOT_FOUND");
  const message = await prisma.ticketMessage.create({ data: { ticketId: id, authorId: req.auth!.id, body } });
  await prisma.ticket.update({ where: { id }, data: { status: "OPEN" } });
  await sendTicketUpdateEmail(ticket.creator.email, ticket.ticketNumber, ticket.subject, "OPEN");
  res.status(201).json({ message });
}));

commerceRouter.get("/reviews", asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { buyerId: req.auth!.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } }
  });
  res.json({ reviews });
}));

commerceRouter.post("/reviews", asyncHandler(async (req, res) => {
  const input = z.object({ orderItemId: z.string().uuid(), rating: z.number().int().min(1).max(5), body: z.string().trim().min(10).max(3000), mediaUrls: z.array(z.string().url()).max(4).default([]) }).parse(req.body);
  const item = await prisma.orderItem.findFirst({ where: { id: input.orderItemId, order: { buyerId: req.auth!.id, paidAt: { not: null } } } });
  if (!item) throw new ApiError(403, "Only verified buyers can review this product.", "REVIEW_NOT_ALLOWED");
  const review = await prisma.review.create({ data: { productId: item.productId, buyerId: req.auth!.id, orderItemId: item.id, rating: input.rating, body: input.body, mediaUrls: input.mediaUrls } });
  const aggregate = await prisma.review.aggregate({ where: { productId: item.productId, isVisible: true }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: item.productId }, data: { averageRating: aggregate._avg.rating ?? 0, reviewCount: aggregate._count } });
  res.status(201).json({ review });
}));

commerceRouter.post("/products/:id/report", asyncHandler(async (req, res) => {
  const productId = z.string().uuid().parse(req.params.id);
  const input = z.object({ reason: z.string().trim().min(3).max(140), details: z.string().trim().max(2000).optional() }).parse(req.body);
  const report = await prisma.productReport.create({ data: { productId, reporterId: req.auth!.id, ...input } });
  res.status(201).json({ report });
}));
