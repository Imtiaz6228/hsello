import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { catalogCategories, catalogProducts, type CatalogCategory, type CatalogProduct } from "../data/catalog";

type ApiCategory = {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description: string;
  sortOrder?: number;
  _count?: { products?: number };
};

type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  type: "DOWNLOAD" | "SERVICE";
  priceCents: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  afterSalesServiceHours?: number;
  averageRating: number | string;
  reviewCount: number;
  salesCount: number;
  deliveryNote?: string | null;
  coverImageUrl?: string | null;
  category: { name: string; slug: string };
  seller: { sellerProfile?: { storeName: string; slug: string } | null };
  _count?: { inventoryItems?: number; files?: number };
};

function iconForSlug(slug: string, index = 0) {
  return catalogCategories.find((category) => category.slug === slug)?.icon ?? ["◉", "f", "𝕏", "☯", "✈", "♪", "G", "◎", "✉"][index % 9];
}

function badgeFor(product: ApiProduct) {
  if (product.salesCount > 500) return "Popular";
  if (product.salesCount > 100) return "Bundle";
  if (product.type === "SERVICE") return "Service";
  return "New";
}

function mapProduct(product: ApiProduct, index = 0): CatalogProduct {
  return {
    id: product.id,
    slug: product.slug,
    category: product.category.name,
    categorySlug: product.category.slug,
    title: product.name,
    description: product.shortDescription,
    longDescription: product.description,
    seller: product.seller.sellerProfile?.storeName ?? "Verified seller",
    sellerSlug: product.seller.sellerProfile?.slug ?? "",
    priceCents: product.priceCents,
    priceCnyCents: product.priceCnyCents,
    priceRubCents: product.priceRubCents,
    afterSalesServiceHours: product.afterSalesServiceHours,
    rating: Number(product.averageRating) || 0,
    reviews: product.reviewCount,
    sales: product.salesCount.toLocaleString(),
    delivery: product.deliveryNote || (product.type === "DOWNLOAD" ? "Instant download" : "Seller delivery"),
    badge: badgeFor(product),
    type: product.type,
    icon: iconForSlug(product.category.slug, index),
    imageUrl: product.coverImageUrl ?? null,
    stockCount: product.type === "SERVICE" ? 999 : Math.max(product._count?.inventoryItems ?? 0, product._count?.files ?? 0)
  };
}

function mapCategories(categories: ApiCategory[]): CatalogCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories.map((category, index) => {
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      parentId: category.parentId ?? null,
      parentSlug: parent?.slug ?? null,
      icon: iconForSlug(parent?.slug ?? category.slug, index),
      sortOrder: category.sortOrder ?? index,
      productCount: category._count?.products ?? 0
    };
  }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

export function useMarketplaceProducts() {
  const [products, setProducts] = useState<CatalogProduct[]>(catalogProducts);
  useEffect(() => {
    void apiRequest<{ products: ApiProduct[] }>("/api/marketplace/products?take=96")
      .then((data) => { if (data.products.length) setProducts(data.products.map(mapProduct)); })
      .catch(() => undefined);
  }, []);
  return products;
}

export function useMarketplaceCategories() {
  const [categories, setCategories] = useState<CatalogCategory[]>(catalogCategories);
  useEffect(() => {
    void apiRequest<{ categories: ApiCategory[] }>("/api/marketplace/categories")
      .then((data) => { if (data.categories.length) setCategories(mapCategories(data.categories)); })
      .catch(() => undefined);
  }, []);
  return categories;
}

export function useMarketplaceProduct(slug?: string) {
  const fallback = catalogProducts.find((item) => item.slug === slug);
  const [product, setProduct] = useState<CatalogProduct | undefined>(fallback);
  const [loading, setLoading] = useState(!fallback);
  useEffect(() => {
    if (!slug) return;
    void apiRequest<{ product: ApiProduct }>(`/api/marketplace/products/${encodeURIComponent(slug)}`)
      .then((data) => setProduct(mapProduct(data.product)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [slug]);
  return { product, loading };
}

export type PublicStore = { name: string; about: string; policy: string; rating: number; sales: string; joined: string; mark: string };

export function useMarketplaceStore(slug?: string) {
  const [store, setStore] = useState<PublicStore>();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(Boolean(slug));
  useEffect(() => {
    if (!slug) return;
    void apiRequest<{ store: { storeName: string; about: string; policy?: string | null; averageRating: number | string; totalSales: number; createdAt: string }; products: Array<Omit<ApiProduct, "seller">> }>(`/api/marketplace/stores/${encodeURIComponent(slug)}`)
      .then((data) => {
        setStore({ name: data.store.storeName, about: data.store.about, policy: data.store.policy || "HSello buyer protection applies to every order.", rating: Number(data.store.averageRating), sales: data.store.totalSales.toLocaleString(), joined: new Date(data.store.createdAt).getFullYear().toString(), mark: data.store.storeName.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() });
        setProducts(data.products.map((product, index) => mapProduct({ ...product, seller: { sellerProfile: { storeName: data.store.storeName, slug } } }, index)));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [slug]);
  return { store, products, loading };
}

export function useMarketplaceCategory(slug?: string) {
  const categories = useMarketplaceCategories();
  const category = useMemo(() => categories.find((item) => item.slug === slug), [categories, slug]);
  return { category, loading: false };
}
