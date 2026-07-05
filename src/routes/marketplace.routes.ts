import { Router } from "express";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error-handler.js";

export const marketplaceRouter = Router();

marketplaceRouter.get("/categories", asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: ProductStatus.APPROVED } } } } }
  });
  res.json({ categories });
}));

marketplaceRouter.get("/products", asyncHandler(async (req, res) => {
  const query = z.object({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).optional(),
    seller: z.string().trim().max(100).optional(),
    take: z.coerce.number().int().min(1).max(48).default(24)
  }).parse(req.query);

  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.APPROVED,
      seller: { isSuspended: false, sellerProfile: { isSuspended: false, isVerified: true } },
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.seller ? { seller: { sellerProfile: { slug: query.seller, isSuspended: false } } } : {}),
      ...(query.q ? { OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { shortDescription: { contains: query.q, mode: "insensitive" } },
        { category: { name: { contains: query.q, mode: "insensitive" } } }
      ] } : {})
    },
    take: query.take,
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    include: {
      category: { select: { name: true, slug: true } },
      seller: { select: { sellerProfile: true } }
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
      }
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
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { publishedAt: "desc" }
  });
  res.json({ store, products });
}));

marketplaceRouter.get("/homepage", asyncHandler(async (_req, res) => {
  const sections = await prisma.homepageSection.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
  res.json({ sections });
}));
