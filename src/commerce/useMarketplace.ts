import { useEffect, useState } from "react";
import { apiRequest, mediaUrl } from "../api/client";
import { catalogCategories, type CatalogCategory, type CatalogProduct } from "../data/catalog";

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
  downloadLimit?: number;
  buyersGetUpdates?: boolean;
  averageRating: number | string;
  reviewCount: number;
  salesCount: number;
  deliveryNote?: string | null;
  coverImageUrl?: string | null;
  category: { name: string; slug: string; parent?: { name: string; slug: string; parent?: { name: string; slug: string } | null } | null };
  seller: { sellerProfile?: { storeName: string; slug: string } | null };
  _count?: { inventoryItems?: number; files?: number };
  reviews?: Array<{ id: string; rating: number; body: string; createdAt: string; sellerResponse?: string | null; buyer: { firstName: string } }>;
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

function normalizePublicMediaUrl(value?: string | null) {
  if (!value) return null;
  return mediaUrl(value);
}

function mapProduct(product: ApiProduct, index = 0): CatalogProduct {
  return {
    id: product.id,
    slug: product.slug,
    category: [product.category.parent?.parent?.name, product.category.parent?.name, product.category.name]
      .filter(Boolean)
      .join(" / "),
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
    imageUrl: normalizePublicMediaUrl(product.coverImageUrl),
    stockCount: product.type === "SERVICE" ? 999 : Math.max(product._count?.inventoryItems ?? 0, product._count?.files ?? 0)
    ,downloadLimit: product.downloadLimit,
    buyersGetUpdates: product.buyersGetUpdates,
    verifiedReviews: product.reviews?.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      buyerName: review.buyer.firstName,
      sellerResponse: review.sellerResponse
    }))
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

function readableError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useMarketplaceProducts(queryString = "") {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    const suffix = queryString ? `&${queryString}` : "";
    void apiRequest<{ products: ApiProduct[]; hasNextPage: boolean; nextCursor?: string | null }>(`/api/marketplace/products?take=24${suffix}`)
      .then((data) => { if (active) { setProducts(data.products.map(mapProduct)); setHasNextPage(data.hasNextPage); setNextCursor(data.nextCursor ?? null); } })
      .catch((requestError) => { if (active) { setProducts([]); setError(readableError(requestError, "Products could not be loaded.")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryString, reloadKey]);
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const suffix = queryString ? `&${queryString}` : "";
      const data = await apiRequest<{ products: ApiProduct[]; hasNextPage: boolean; nextCursor?: string | null }>(`/api/marketplace/products?take=24&cursor=${encodeURIComponent(nextCursor)}${suffix}`);
      setProducts((current) => [...current, ...data.products.map(mapProduct)].filter((product, index, all) => all.findIndex((candidate) => candidate.id === product.id) === index));
      setHasNextPage(data.hasNextPage);
      setNextCursor(data.nextCursor ?? null);
    } catch (requestError) {
      setError(readableError(requestError, "More products could not be loaded."));
    } finally { setLoadingMore(false); }
  }
  return { products, loading, loadingMore, hasNextPage, error, loadMore, retry: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceCategories() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void apiRequest<{ categories: ApiCategory[] }>("/api/marketplace/categories")
      .then((data) => { if (active) setCategories(mapCategories(data.categories)); })
      .catch((requestError) => { if (active) { setCategories([]); setError(readableError(requestError, "Categories could not be loaded.")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  return { categories, loading, error, retry: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceProduct(slug?: string) {
  const [product, setProduct] = useState<CatalogProduct | undefined>();
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void apiRequest<{ product: ApiProduct }>(`/api/marketplace/products/${encodeURIComponent(slug)}`)
      .then((data) => { if (active) setProduct(mapProduct(data.product)); })
      .catch((requestError) => { if (active) { setProduct(undefined); setError(readableError(requestError, "Product could not be loaded.")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  return { product, loading, error };
}

export type PublicStore = { name: string; about: string; policy: string; rating: number; sales: string; joined: string; mark: string; logoUrl?: string | null; bannerUrl?: string | null };

export function useMarketplaceStore(slug?: string) {
  const [store, setStore] = useState<PublicStore>();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void apiRequest<{ store: { storeName: string; about: string; policy?: string | null; averageRating: number | string; totalSales: number; createdAt: string; logoUrl?: string | null; bannerUrl?: string | null }; products: Array<Omit<ApiProduct, "seller">> }>(`/api/marketplace/stores/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return;
        setStore({ name: data.store.storeName, about: data.store.about, policy: data.store.policy || "HSello buyer protection applies to every order.", rating: Number(data.store.averageRating), sales: data.store.totalSales.toLocaleString(), joined: new Date(data.store.createdAt).getFullYear().toString(), mark: data.store.storeName.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(), logoUrl: normalizePublicMediaUrl(data.store.logoUrl), bannerUrl: normalizePublicMediaUrl(data.store.bannerUrl) });
        setProducts(data.products.map((product, index) => mapProduct({ ...product, seller: { sellerProfile: { storeName: data.store.storeName, slug } } }, index)));
      })
      .catch((requestError) => { if (active) setError(readableError(requestError, "Store could not be loaded.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  return { store, products, loading, error };
}
