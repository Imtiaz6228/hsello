import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/error-handler.js";
import { generateAiReply } from "../services/ai-support.service.js";
import { EarningsAnalyticsService, type Granularity } from "../services/earnings-analytics.service.js";
import { sensitiveLimiter } from "../middleware/rate-limit.js";

export const supportAssistantRouter = Router();
const staff = requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN);
const earnings = new EarningsAnalyticsService();

supportAssistantRouter.use(requireAuth);

supportAssistantRouter.post("/ai/support", sensitiveLimiter, asyncHandler(async (req, res) => {
  const input = z.object({ message: z.string().trim().min(1).max(4000), sessionId: z.string().uuid().optional() }).parse(req.body);
  let session = input.sessionId
    ? await prisma.chatSession.findFirst({ where: { id: input.sessionId, userId: req.auth!.id } })
    : null;
  if (!session) session = await prisma.chatSession.create({ data: { userId: req.auth!.id, subject: input.message.slice(0, 80) } });
  await prisma.chatMessage.create({ data: { sessionId: session.id, authorId: req.auth!.id, role: "user", body: input.message } });
  const answer = await generateAiReply(input.message, req.auth!.id);
  await prisma.chatMessage.create({ data: { sessionId: session.id, role: "assistant", body: answer.reply, metadata: { quickActions: answer.quickActions } } });
  res.json({ sessionId: session.id, reply: answer.reply, quickActions: answer.quickActions, sources: answer.kbResults.map((article) => ({ title: article.title, slug: article.slug })) });
}));

supportAssistantRouter.get("/chat/sessions", asyncHandler(async (req, res) => {
  const sessions = await prisma.chatSession.findMany({ where: { userId: req.auth!.id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } }, orderBy: { updatedAt: "desc" }, take: 30 });
  res.json({ sessions });
}));

supportAssistantRouter.post("/chat/human", asyncHandler(async (req, res) => {
  const input = z.object({
    sessionId: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(4000).default("I would like to chat with an administrator.")
  }).parse(req.body);
  let session = input.sessionId
    ? await prisma.chatSession.findFirst({ where: { id: input.sessionId, userId: req.auth!.id } })
    : null;
  if (!session) {
    session = await prisma.chatSession.create({
      data: { userId: req.auth!.id, subject: input.message.slice(0, 80), status: "HUMAN" }
    });
    await prisma.chatMessage.create({
      data: { sessionId: session.id, authorId: req.auth!.id, role: "user", body: input.message }
    });
  } else {
    await prisma.chatSession.update({ where: { id: session.id }, data: { status: "HUMAN", resolved: false } });
  }
  res.json({ sessionId: session.id, message: "An administrator has been notified." });
}));

supportAssistantRouter.post("/chat/:id/human", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const session = await prisma.chatSession.findFirst({ where: { id, userId: req.auth!.id } });
  if (!session) throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
  await prisma.chatSession.update({ where: { id: session.id }, data: { status: "HUMAN" } });
  res.json({ message: "A human support request has been sent to admin." });
}));

supportAssistantRouter.post("/chat/:id/messages", asyncHandler(async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const id = String(req.params.id);
  const session = await prisma.chatSession.findFirst({ where: { id, userId: req.auth!.id } });
  if (!session) throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
  const message = await prisma.chatMessage.create({ data: { sessionId: session.id, authorId: req.auth!.id, role: "user", body } });
  await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });
  res.status(201).json({ message });
}));

supportAssistantRouter.post("/live/activity", asyncHandler(async (req, res) => {
  const input = z.object({ sessionId: z.string().uuid().optional(), currentUrl: z.string().max(1000).optional() }).parse(req.body);
  const existing = input.sessionId ? await prisma.liveSession.findFirst({ where: { id: input.sessionId, userId: req.auth!.id } }) : null;
  const session = existing
    ? await prisma.liveSession.update({ where: { id: existing.id }, data: { currentUrl: input.currentUrl, lastActivity: new Date(), status: "ACTIVE" } })
    : await prisma.liveSession.create({ data: { userId: req.auth!.id, currentUrl: input.currentUrl, userAgent: req.get("user-agent") } });
  res.json({ sessionId: session.id, status: session.status });
}));

supportAssistantRouter.post("/live/typing", asyncHandler(async (req, res) => {
  const input = z.object({ sessionId: z.string().uuid().optional(), isTyping: z.boolean() }).parse(req.body);
  if (input.sessionId) await prisma.liveSession.updateMany({ where: { id: input.sessionId, userId: req.auth!.id }, data: { isTyping: input.isTyping, lastActivity: new Date() } });
  res.json({ ok: true });
}));

supportAssistantRouter.get("/admin/chats", staff, asyncHandler(async (_req, res) => {
  const sessions = await prisma.chatSession.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true, role: true } }, messages: { orderBy: { createdAt: "desc" }, take: 500 } }, orderBy: { updatedAt: "desc" }, take: 100 });
  res.json({ sessions });
}));

supportAssistantRouter.get("/admin/earnings/daily", staff, asyncHandler(async (req, res) => {
  const input = z.object({ from: z.string(), to: z.string(), granularity: z.enum(["daily", "weekly", "monthly"]).default("daily") }).parse(req.query);
  res.json(await earnings.getAdminReport(new Date(`${input.from}T00:00:00.000Z`), new Date(`${input.to}T23:59:59.999Z`), input.granularity as Granularity));
}));

supportAssistantRouter.get("/seller/earnings/daily", requireRole(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const input = z.object({ from: z.string(), to: z.string(), granularity: z.enum(["daily", "weekly", "monthly"]).default("daily") }).parse(req.query);
  res.json(await earnings.getSellerReport(req.auth!.id, new Date(`${input.from}T00:00:00.000Z`), new Date(`${input.to}T23:59:59.999Z`), input.granularity as Granularity));
}));

supportAssistantRouter.post("/admin/chats/:id/reply", staff, asyncHandler(async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const session = await prisma.chatSession.findUnique({ where: { id: String(req.params.id) } });
  if (!session) throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
  const message = await prisma.chatMessage.create({ data: { sessionId: session.id, authorId: req.auth!.id, role: "admin", body } });
  await prisma.chatSession.update({ where: { id: session.id }, data: { status: "HUMAN", updatedAt: new Date() } });
  res.status(201).json({ message });
}));

supportAssistantRouter.get("/admin/live", staff, asyncHandler(async (_req, res) => {
  const sessions = await prisma.liveSession.findMany({ where: { status: { in: ["ACTIVE", "TAKEN_OVER"] } }, include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } }, orderBy: { lastActivity: "desc" }, take: 200 });
  res.json({ sessions });
}));
