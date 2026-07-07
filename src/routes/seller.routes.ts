import fs from "node:fs/promises";
import { Router } from "express";
import { ProductStatus, ProductType, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { imageUpload, productFileUpload, publicUploadUrl } from "../middleware/upload.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sellerApplicationSchema } from "../schemas/seller.schemas.js";
import {
  getSellerApplicationForUser,
  submitSellerApplication
} from "../services/seller.service.js";

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireVerifiedUser);

sellerRouter.get("/application", asyncHandler(async (req, res) => {
  const application = await getSellerApplicationForUser(req.auth!.id);

  res.json({ application });
}));

sellerRouter.post("/application", asyncHandler(async (req, res) => {
  const input = sellerApplicationSchema.parse(req.body);
  const application = await submitSellerApplication(req.auth!.id, input);

  res.status(201).json({
    message: "Seller application submitted successfully.",
    application
  });
}));

const requireSeller = (req: Parameters<typeof requireVerifiedUser>[0], _res: Parameters<typeof requireVerifiedUser>[1], next: Parameters<typeof requireVerifiedUser>[2]) => {
  const sellerRoles: Role[] = [Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN];
  if (!req.auth || !sellerRoles.includes(req.auth.role)) {
    next(new ApiError(403, "Approved seller access is required.", "SELLER_REQUIRED"));
    return;
  }
  next();
};

const emptyToNull = (value: unknown) => value === "" || value === "null" ? null : value;
const emptyToUndefined = (value: unknown) => value === "" ? undefined : value;

const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(3).max(160),
  shortDescription: z.string().trim().min(10).max(240),
  description: z.string().trim().min(30).max(20000),
  type: z.nativeEnum(ProductType),
  priceCents: z.coerce.number().int().min(50).max(10_000_000),
  compareAtPriceCents: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable().optional()),
  currency: z.string().length(3).default("USD"),
  coverImageUrl: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  deliveryNote: z.preprocess(emptyToNull, z.string().trim().max(1000).nullable().optional()),
  downloadLimit: z.coerce.number().int().min(1).max(100).default(5),
  downloadExpiryHours: z.coerce.number().int().min(1).max(8760).default(168),
  buyersGetUpdates: z.preprocess((value) => {
    if (value === "true" || value === "on") return true;
    if (value === "false") return false;
    return value;
  }, z.boolean().default(true)),
  seoTitle: z.preprocess(emptyToUndefined, z.string().trim().max(70).optional()),
  seoDescription: z.preprocess(emptyToUndefined, z.string().trim().max(170).optional())
});

async function deleteUploadedFile(file?: Express.Multer.File) {
  if (!file) return;
  await fs.unlink(file.path).catch(() => undefined);
}

sellerRouter.get("/profile", requireSeller, asyncHandler(async (req, res) => {
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.auth!.id } });
  res.json({ profile });
}));

sellerRouter.patch("/profile", requireSeller, asyncHandler(async (req, res) => {
  const input = z.object({ about: z.string().trim().min(20).max(5000).optional(), logoUrl: z.string().url().nullable().optional(), bannerUrl: z.string().url().nullable().optional(), policy: z.string().trim().max(5000).nullable().optional() }).parse(req.body);
  const profile = await prisma.sellerProfile.update({ where: { userId: req.auth!.id }, data: input });
  res.json({ profile });
}));

sellerRouter.get("/products", requireSeller, asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({ where: { sellerId: req.auth!.id }, orderBy: { updatedAt: "desc" }, include: { category: true, files: true } });
  res.json({ products });
}));

sellerRouter.post("/products", requireSeller, imageUpload.single("coverImage"), asyncHandler(async (req, res) => {
  try {
    const input = productSchema.parse(req.body);
    const base = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
    const coverImageUrl = req.file ? publicUploadUrl(req.file.filename) : input.coverImageUrl ?? null;
    const product = await prisma.product.create({ data: { ...input, coverImageUrl, slug: `${base}-${crypto.randomUUID().slice(0, 8)}`, sellerId: req.auth!.id, status: ProductStatus.DRAFT } });
    res.status(201).json({ product });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
}));

sellerRouter.patch("/products/:id", requireSeller, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = productSchema.partial().parse(req.body);
  const existing = await prisma.product.findFirst({ where: { id, sellerId: req.auth!.id } });
  if (!existing) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
  const product = await prisma.product.update({ where: { id }, data: { ...input, status: existing.status === ProductStatus.APPROVED ? ProductStatus.PENDING : existing.status } });
  res.json({ product });
}));

sellerRouter.post("/products/:id/submit", requireSeller, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const existing = await prisma.product.findFirst({ where: { id, sellerId: req.auth!.id }, include: { files: { where: { isActive: true } } } });
  if (!existing) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
  if (existing.type === ProductType.DOWNLOAD && existing.files.length === 0) throw new ApiError(400, "Upload at least one file before review.", "PRODUCT_FILE_REQUIRED");
  const product = await prisma.product.update({ where: { id }, data: { status: ProductStatus.PENDING, rejectionReason: null } });
  res.json({ product });
}));

sellerRouter.post("/products/:id/image", requireSeller, imageUpload.single("coverImage"), asyncHandler(async (req, res) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    if (!req.file) throw new ApiError(400, "Choose a product image.", "PRODUCT_IMAGE_REQUIRED");
    const existing = await prisma.product.findFirst({ where: { id, sellerId: req.auth!.id } });
    if (!existing) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    const product = await prisma.product.update({
      where: { id },
      data: {
        coverImageUrl: publicUploadUrl(req.file.filename),
        status: existing.status === ProductStatus.APPROVED ? ProductStatus.PENDING : existing.status
      }
    });
    res.json({ product });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
}));

sellerRouter.post("/products/:id/files", requireSeller, productFileUpload.single("file"), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const product = await prisma.product.findFirst({ where: { id, sellerId: req.auth!.id } });
  if (!product) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
  if (!req.file) throw new ApiError(400, "Choose a product file.", "PRODUCT_FILE_REQUIRED");
  const latest = await prisma.productFile.aggregate({ where: { productId: id }, _max: { version: true } });
  const file = await prisma.productFile.create({ data: { productId: id, displayName: req.file.originalname, storagePath: req.file.path, mimeType: req.file.mimetype, sizeBytes: req.file.size, version: (latest._max.version ?? 0) + 1 } });
  if (product.buyersGetUpdates) {
    const eligibleItems = await prisma.orderItem.findMany({
      where: { productId: id, order: { paidAt: { not: null }, status: { notIn: ["REFUNDED", "CANCELLED"] } } },
      select: { id: true }
    });
    if (eligibleItems.length) {
      await prisma.downloadGrant.createMany({
        data: eligibleItems.map((item) => ({
          orderItemId: item.id,
          productFileId: file.id,
          tokenHash: sha256(randomToken(40)),
          maxDownloads: product.downloadLimit,
          expiresAt: new Date(Date.now() + product.downloadExpiryHours * 60 * 60 * 1000)
        }))
      });
    }
  }
  res.status(201).json({ file });
}));

sellerRouter.get("/orders", requireSeller, asyncHandler(async (req, res) => {
  const items = await prisma.orderItem.findMany({ where: { sellerId: req.auth!.id }, orderBy: { order: { createdAt: "desc" } }, include: { order: { include: { payment: true, buyer: { select: { firstName: true, lastName: true } } } }, product: true } });
  res.json({ items });
}));

sellerRouter.post("/reviews/:id/respond", requireSeller, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { response } = z.object({ response: z.string().trim().min(2).max(2000) }).parse(req.body);
  const review = await prisma.review.findFirst({ where: { id, product: { sellerId: req.auth!.id } } });
  if (!review) throw new ApiError(404, "Review not found.", "REVIEW_NOT_FOUND");
  const updated = await prisma.review.update({ where: { id }, data: { sellerResponse: response, respondedAt: new Date() } });
  res.json({ review: updated });
}));

sellerRouter.get("/reviews", requireSeller, asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { product: { sellerId: req.auth!.id } },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } }, buyer: { select: { firstName: true } } }
  });
  res.json({ reviews });
}));

sellerRouter.get("/tickets", requireSeller, asyncHandler(async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { order: { items: { some: { sellerId: req.auth!.id } } } },
    orderBy: { updatedAt: "desc" },
    include: { creator: { select: { firstName: true, email: true } }, messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" } } }
  });
  res.json({ tickets });
}));

sellerRouter.post("/tickets/:id/reply", requireSeller, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const ticket = await prisma.ticket.findFirst({ where: { id, order: { items: { some: { sellerId: req.auth!.id } } } }, include: { creator: true } });
  if (!ticket) throw new ApiError(404, "Order ticket not found.", "TICKET_NOT_FOUND");
  const message = await prisma.ticketMessage.create({ data: { ticketId: id, authorId: req.auth!.id, body } });
  await prisma.ticket.update({ where: { id }, data: { status: "PENDING" } });
  await sendTicketUpdateEmail(ticket.creator.email, ticket.ticketNumber, ticket.subject, "PENDING");
  res.status(201).json({ message });
}));
