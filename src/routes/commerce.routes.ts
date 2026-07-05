import path from "node:path";
import { Router } from "express";
import { PaymentMethod, TicketCategory } from "@prisma/client";
import { z } from "zod";
import { sha256 } from "../lib/crypto.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { availablePaymentMethods, confirmHostedPayment, createCheckout } from "../services/payment.service.js";

export const commerceRouter = Router();

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  method: z.nativeEnum(PaymentMethod),
  couponCode: z.string().trim().max(40).optional()
});

commerceRouter.get("/payment-methods", (_req, res) => res.json({ methods: availablePaymentMethods() }));

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

commerceRouter.get("/orders", asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: req.auth!.id }, orderBy: { createdAt: "desc" },
    include: {
      payment: true,
      items: { include: { product: { select: { slug: true, type: true, coverImageUrl: true } }, downloadGrants: { include: { productFile: true } } } },
      refunds: { orderBy: { createdAt: "desc" }, take: 1 }, disputes: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  res.json({ orders });
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

commerceRouter.post("/orders/:id/refunds", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const input = z.object({ reason: z.string().trim().min(20).max(2000), amountCents: z.number().int().positive().optional() }).parse(req.body);
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: req.auth!.id } });
  if (!order || !order.paidAt) throw new ApiError(400, "Only paid orders can be refunded.", "REFUND_NOT_ALLOWED");
  const refund = await prisma.refund.create({ data: { orderId, requestedById: req.auth!.id, reason: input.reason, amountCents: Math.min(input.amountCents ?? order.totalCents, order.totalCents) } });
  res.status(201).json({ refund });
}));

commerceRouter.post("/orders/:id/disputes", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const input = z.object({ subject: z.string().trim().min(5).max(140), description: z.string().trim().min(20).max(4000) }).parse(req.body);
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: req.auth!.id } });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  const dispute = await prisma.dispute.create({ data: { orderId, openedById: req.auth!.id, ...input } });
  await prisma.order.update({ where: { id: orderId }, data: { status: "DISPUTED" } });
  res.status(201).json({ dispute });
}));

commerceRouter.get("/orders/:id/messages", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const order = await prisma.order.findFirst({ where: { id: orderId, OR: [{ buyerId: req.auth!.id }, { items: { some: { sellerId: req.auth!.id } } }] } });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  const messages = await prisma.orderMessage.findMany({ where: { orderId }, orderBy: { createdAt: "asc" }, include: { author: { select: { firstName: true, role: true } } } });
  res.json({ messages });
}));

commerceRouter.post("/orders/:id/messages", asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.id);
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const order = await prisma.order.findFirst({ where: { id: orderId, OR: [{ buyerId: req.auth!.id }, { items: { some: { sellerId: req.auth!.id } } }] } });
  if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  const message = await prisma.orderMessage.create({ data: { orderId, authorId: req.auth!.id, body } });
  res.status(201).json({ message });
}));

commerceRouter.get("/tickets", asyncHandler(async (req, res) => {
  const tickets = await prisma.ticket.findMany({ where: { creatorId: req.auth!.id }, orderBy: { updatedAt: "desc" }, include: { messages: { orderBy: { createdAt: "asc" } } } });
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
