import { Router } from "express";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { ensureDefaultMarketplaceCategories } from "../services/category.service.js";

export const marketplaceRouter = Router();

marketplaceRouter.get("/categories", asyncHandler(async (_req, res) => {
  await ensureDefaultMarketplaceCategories();
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, slug: true, name: true } },
      _count: { select: { products: { where: { status: ProductStatus.APPROVED } } } }
    }
  });
  res.json({ categories });
}));

marketplaceRouter.get("/products", asyncHandler(async (req, res) => {
  const query = z.object({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).optional(),
    seller: z.string().trim().max(100).optional(),
    take: z.coerce.number().int().min(1).max(96).default(24),
    sort: z.enum(["popular", "price_asc", "price_desc", "newest"]).default("popular"),
    stock: z.enum(["all", "in_stock"]).default("all")
  }).parse(req.query);

  const filters: any[] = [];
  if (query.category) {
    filters.push({ OR: [{ category: { slug: query.category } }, { category: { parent: { slug: query.category } } }] });
  }
  if (query.q) {
    filters.push({ OR: [
      { name: { contains: query.q, mode: "insensitive" } },
      { shortDescription: { contains: query.q, mode: "insensitive" } },
      { category: { name: { contains: query.q, mode: "insensitive" } } }
    ] });
  }

  if (query.stock === "in_stock") {
    filters.push({
      OR: [
        { type: "SERVICE" },
        { files: { some: { isActive: true } } },
        { inventoryItems: { some: { isActive: true, orderItemId: null } } }
      ]
    });
  }

  const orderBy = query.sort === "price_asc"
    ? [{ priceCents: "asc" as const }]
    : query.sort === "price_desc"
      ? [{ priceCents: "desc" as const }]
      : query.sort === "newest"
        ? [{ publishedAt: "desc" as const }]
        : [{ salesCount: "desc" as const }, { publishedAt: "desc" as const }];

  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.APPROVED,
      seller: query.seller
        ? { isSuspended: false, sellerProfile: { slug: query.seller, isSuspended: false, isVerified: true } }
        : { isSuspended: false, sellerProfile: { isSuspended: false, isVerified: true } },
      ...(filters.length ? { AND: filters } : {})
    },
    take: query.take,
    orderBy,
    include: {
      category: { select: { name: true, slug: true } },
      seller: { select: { sellerProfile: true } },
      _count: { select: { files: { where: { isActive: true } }, inventoryItems: { where: { isActive: true, orderItemId: null } } } }
    }
  });
  res.json({ products });
}));

marketplaceRouter.get("/products/:slug", asyncHandler(async (req, res) => {
  const slug = z.string().min(1).max(160).parse(req.params.slug);
  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.APPROVED, seller: { isSuspended: false, sellerProfile: { isSuspended: false } } },
    include: {
      category: true,
      seller: { select: { sellerProfile: true } },
      reviews: {
        where: { isVisible: true }, orderBy: { createdAt: "desc" }, take: 20,
        include: { buyer: { select: { firstName: true, profileImageUrl: true } } }
      },
      _count: { select: { files: { where: { isActive: true } }, inventoryItems: { where: { isActive: true, orderItemId: null } } } }
    }
  });
  if (!product) { res.status(404).json({ message: "Product not found.", code: "PRODUCT_NOT_FOUND" }); return; }
  res.json({ product });
}));

marketplaceRouter.get("/stores/:slug", asyncHandler(async (req, res) => {
  const slug = z.string().min(1).max(160).parse(req.params.slug);
  const store = await prisma.sellerProfile.findFirst({
    where: { slug, isVerified: true, isSuspended: false, user: { isSuspended: false } },
    include: {
      user: { select: { id: true, username: true, createdAt: true } }
    }
  });
  if (!store) { res.status(404).json({ message: "Store not found.", code: "STORE_NOT_FOUND" }); return; }
  const products = await prisma.product.findMany({
    where: { sellerId: store.userId, status: ProductStatus.APPROVED },
    include: { category: { select: { name: true, slug: true } }, _count: { select: { files: { where: { isActive: true } }, inventoryItems: { where: { isActive: true, orderItemId: null } } } } },
    orderBy: { publishedAt: "desc" }
  });
  res.json({ store, products });
}));

marketplaceRouter.get("/homepage", asyncHandler(async (_req, res) => {
  const sections = await prisma.homepageSection.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
  res.json({ sections });
}));
