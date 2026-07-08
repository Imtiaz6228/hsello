import fs from "node:fs/promises";
import { Router, type Request } from "express";
import { ProductStatus, ProductType, Role, SellerApplicationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { imageUpload, productFileUpload, publicUploadUrl, sellerDocumentUpload } from "../middleware/upload.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import { ensureDefaultMarketplaceCategories } from "../services/category.service.js";
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

sellerRouter.post(
  "/application",
  sellerDocumentUpload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    try {
      const input = sellerApplicationSchema.parse(req.body);
      const documents = getSellerDocumentFiles(req);
      const application = await submitSellerApplication(req.auth!.id, input, documents);

      res.status(201).json({
        message: "Seller application submitted successfully. It is now pending approval / in moderation.",
        application
      });
    } catch (error) {
      await deleteUploadedApplicationDocuments(req);
      throw error;
    }
  })
);

const requireSeller = asyncHandler(async (req, _res, next) => {
  if (!req.auth) {
    throw new ApiError(403, "Approved seller access is required.", "SELLER_REQUIRED");
  }

  if (req.auth.role === Role.ADMIN || req.auth.role === Role.SUPER_ADMIN) {
    next();
    return;
  }

  if (req.auth.role !== Role.SELLER) {
    throw new ApiError(403, "Approved seller access is required.", "SELLER_REQUIRED");
  }

  const [application, profile] = await Promise.all([
    prisma.sellerApplication.findUnique({ where: { userId: req.auth.id }, select: { status: true } }),
    prisma.sellerProfile.findUnique({ where: { userId: req.auth.id }, select: { isVerified: true, isSuspended: true } })
  ]);

  if (application?.status !== SellerApplicationStatus.APPROVED || !profile?.isVerified || profile.isSuspended) {
    throw new ApiError(403, "Your seller account is not approved yet or is currently suspended.", "SELLER_NOT_APPROVED");
  }

  next();
});

function getSellerDocumentFiles(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const front = files?.documentFront?.[0];
  const back = files?.documentBack?.[0];

  if (!front || !back) {
    throw new ApiError(400, "Upload both the front and back side of the seller document.", "SELLER_DOCUMENTS_REQUIRED");
  }

  return { front, back };
}

async function deleteUploadedApplicationDocuments(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const uploadedFiles = Object.values(files ?? {}).flat();
  await Promise.all(uploadedFiles.map((file) => deleteUploadedFile(file)));
}

const emptyToNull = (value: unknown) => value === "" || value === "null" ? null : value;
const emptyToUndefined = (value: unknown) => value === "" || value === undefined ? undefined : value;
const checkboxToBoolean = (value: unknown) => {
  if (value === "true" || value === "on") return true;
  if (value === "false") return false;
  return value;
};

const optionalCents = z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(100_000_000).optional());

const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(3).max(160),
  shortDescription: z.string().trim().min(10).max(240),
  description: z.string().trim().min(30).max(20000),
  type: z.nativeEnum(ProductType).default(ProductType.DOWNLOAD),
  priceCents: optionalCents,
  priceUsdCents: optionalCents,
  priceCnyCents: optionalCents.default(0),
  priceRubCents: optionalCents.default(0),
  compareAtPriceCents: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable().optional()),
  currency: z.string().length(3).default("USD"),
  coverImageUrl: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  deliveryNote: z.preprocess(emptyToNull, z.string().trim().max(1000).nullable().optional()),
  downloadLimit: z.coerce.number().int().min(1).max(100).default(5),
  downloadExpiryHours: z.coerce.number().int().min(1).max(8760).default(168),
  afterSalesServiceHours: z.coerce.number().int().min(12).max(8760).default(12),
  buyersGetUpdates: z.preprocess(checkboxToBoolean, z.boolean().default(true)),
  inventoryLines: z.preprocess(emptyToUndefined, z.string().trim().max(500_000).optional()),
  seoTitle: z.preprocess(emptyToUndefined, z.string().trim().max(70).optional()),
  seoDescription: z.preprocess(emptyToUndefined, z.string().trim().max(170).optional())
});

function parseInventoryLines(raw?: string | null) {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^"(.*)"$/, "$1").trim())
    .filter(Boolean);
  const unique = [...new Set(lines)];
  if (unique.length > 5000) {
    throw new ApiError(400, "Upload at most 5,000 product inventory rows at once.", "INVENTORY_LIMIT");
  }
  const tooLong = unique.find((line) => line.length > 4000);
  if (tooLong) {
    throw new ApiError(400, "Each product inventory row must be 4,000 characters or less.", "INVENTORY_ROW_TOO_LONG");
  }
  return unique;
}

function productDataFromInput(input: z.infer<typeof productSchema>, coverImageUrl: string | null) {
  const priceUsdCents = input.priceUsdCents ?? input.priceCents;
  if (!priceUsdCents || priceUsdCents < 50) {
    throw new ApiError(400, "Set a USD price of at least $0.50.", "USD_PRICE_REQUIRED");
  }

  return {
    categoryId: input.categoryId,
    name: input.name,
    shortDescription: input.shortDescription,
    description: input.description,
    type: input.type,
    priceCents: priceUsdCents,
    priceUsdCents,
    priceCnyCents: input.priceCnyCents ?? 0,
    priceRubCents: input.priceRubCents ?? 0,
    compareAtPriceCents: input.compareAtPriceCents,
    currency: "USD",
    coverImageUrl,
    deliveryNote: input.deliveryNote,
    downloadLimit: input.downloadLimit,
    downloadExpiryHours: input.downloadExpiryHours,
    afterSalesServiceHours: input.afterSalesServiceHours,
    buyersGetUpdates: input.buyersGetUpdates,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription
  };
}

async function deleteUploadedFile(file?: Express.Multer.File) {
  if (!file) return;
  await fs.unlink(file.path).catch(() => undefined);
}


function slugifyCategoryName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "category";
}

async function uniqueCategorySlug(name: string) {
  const base = slugifyCategoryName(name);
  let slug = base;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

sellerRouter.get("/categories", requireSeller, asyncHandler(async (_req, res) => {
  await ensureDefaultMarketplaceCategories();
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { parent: { select: { id: true, slug: true, name: true } } }
  });
  res.json({ categories });
}));

sellerRouter.post("/categories", requireSeller, asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(12).max(4000),
    parentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    sortOrder: z.coerce.number().int().min(0).max(10000).default(1000)
  }).parse(req.body);

  if (input.parentId) {
    const parent = await prisma.category.findFirst({ where: { id: input.parentId, isActive: true }, select: { id: true } });
    if (!parent) throw new ApiError(404, "Parent category not found.", "CATEGORY_PARENT_NOT_FOUND");
  }

  const slug = await uniqueCategorySlug(input.name);
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder,
      seoTitle: input.name,
      seoDescription: input.description.slice(0, 170),
      isActive: true
    }
  });

  res.status(201).json({ category, message: "Category added. You can select it when creating products." });
}));

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
  const products = await prisma.product.findMany({
    where: { sellerId: req.auth!.id },
    orderBy: { updatedAt: "desc" },
    include: {
      category: { include: { parent: true } },
      files: { where: { isActive: true } },
      inventoryItems: { select: { id: true, deliveredAt: true, isActive: true, createdAt: true } }
    }
  });
  res.json({ products });
}));

sellerRouter.post("/products", requireSeller, imageUpload.single("coverImage"), asyncHandler(async (req, res) => {
  try {
    const input = productSchema.parse(req.body);
    const inventoryLines = parseInventoryLines(input.inventoryLines);
    const base = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
    const coverImageUrl = req.file ? publicUploadUrl(req.file.filename) : input.coverImageUrl ?? null;
    const productData = productDataFromInput(input, coverImageUrl);
    const status = ProductStatus.PENDING;
    const product = await prisma.product.create({
      data: {
        ...productData,
        slug: `${base}-${crypto.randomUUID().slice(0, 8)}`,
        sellerId: req.auth!.id,
        status,
        ...(inventoryLines.length ? { inventoryItems: { createMany: { data: inventoryLines.map((content) => ({ content, source: "MANUAL" })) } } } : {})
      },
      include: { category: true, files: true, inventoryItems: { select: { id: true, deliveredAt: true, isActive: true } } }
    });
    res.status(201).json({ product, message: "Product submitted for admin approval." });
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

  const data: any = { ...input };
  delete data.inventoryLines;
  if (input.priceUsdCents !== undefined || input.priceCents !== undefined) {
    const priceUsdCents = input.priceUsdCents ?? input.priceCents;
    if (!priceUsdCents || priceUsdCents < 50) throw new ApiError(400, "Set a USD price of at least $0.50.", "USD_PRICE_REQUIRED");
    data.priceCents = priceUsdCents;
    data.priceUsdCents = priceUsdCents;
  }
  if (input.currency) data.currency = "USD";
  data.status = existing.status === ProductStatus.APPROVED ? ProductStatus.PENDING : existing.status;

  const product = await prisma.product.update({ where: { id }, data });
  const inventoryLines = parseInventoryLines(input.inventoryLines);
  if (inventoryLines.length) {
    await prisma.productInventoryItem.createMany({ data: inventoryLines.map((content) => ({ productId: id, content, source: "MANUAL" })) });
  }
  res.json({ product });
}));

sellerRouter.post("/products/:id/submit", requireSeller, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const existing = await prisma.product.findFirst({
    where: { id, sellerId: req.auth!.id },
    include: { files: { where: { isActive: true } }, inventoryItems: { where: { isActive: true, orderItemId: null } } }
  });
  if (!existing) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
  if (existing.afterSalesServiceHours < 12) {
    throw new ApiError(400, "After-sales service time must be at least 12 hours.", "AFTER_SALES_MINIMUM");
  }
  const product = await prisma.product.update({ where: { id }, data: { status: ProductStatus.PENDING, rejectionReason: null } });
  res.json({ product, message: "Product submitted for admin approval." });
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

sellerRouter.post("/products/:id/inventory/manual", requireSeller, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { inventoryLines } = z.object({ inventoryLines: z.string().trim().min(1).max(500_000) }).parse(req.body);
  const product = await prisma.product.findFirst({ where: { id, sellerId: req.auth!.id } });
  if (!product) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
  const lines = parseInventoryLines(inventoryLines);
  if (!lines.length) throw new ApiError(400, "Add at least one inventory row.", "INVENTORY_REQUIRED");
  await prisma.productInventoryItem.createMany({ data: lines.map((content) => ({ productId: id, content, source: "MANUAL" })) });
  res.status(201).json({ count: lines.length });
}));

sellerRouter.post("/products/:id/inventory/file", requireSeller, productFileUpload.single("file"), asyncHandler(async (req, res) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const product = await prisma.product.findFirst({ where: { id, sellerId: req.auth!.id } });
    if (!product) throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    if (!req.file) throw new ApiError(400, "Choose a text or CSV inventory file.", "INVENTORY_FILE_REQUIRED");
    const text = await fs.readFile(req.file.path, "utf8");
    const lines = parseInventoryLines(text);
    if (!lines.length) throw new ApiError(400, "The inventory file did not contain any rows.", "INVENTORY_FILE_EMPTY");
    await prisma.productInventoryItem.createMany({ data: lines.map((content) => ({ productId: id, content, source: "FILE" })) });
    res.status(201).json({ count: lines.length });
  } finally {
    await deleteUploadedFile(req.file);
  }
}));

sellerRouter.get("/orders", requireSeller, asyncHandler(async (req, res) => {
  const items = await prisma.orderItem.findMany({
    where: { sellerId: req.auth!.id },
    orderBy: { order: { createdAt: "desc" } },
    include: {
      order: { include: { payment: true, buyer: { select: { firstName: true, lastName: true } }, disputes: { orderBy: { createdAt: "desc" }, take: 1 } } },
      product: true,
      inventoryItems: { select: { id: true, deliveredAt: true } }
    }
  });
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
