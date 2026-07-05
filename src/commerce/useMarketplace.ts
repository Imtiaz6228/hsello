import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { catalogProducts, type CatalogProduct } from "../data/catalog";

type ApiProduct = {
  id: string; slug: string; name: string; shortDescription: string; description: string;
  type: "DOWNLOAD" | "SERVICE"; priceCents: number; averageRating: number | string;
  reviewCount: number; salesCount: number; deliveryNote?: string | null;
  category: { name: string; slug: string };
  seller: { sellerProfile?: { storeName: string; slug: string } | null };
};

function mapProduct(product: ApiProduct, index = 0): CatalogProduct {
  return {
    id: product.id, slug: product.slug, category: product.category.name, categorySlug: product.category.slug,
    title: product.name, description: product.shortDescription, longDescription: product.description,
    seller: product.seller.sellerProfile?.storeName ?? "Verified seller",
    sellerSlug: product.seller.sellerProfile?.slug ?? "", priceCents: product.priceCents,
    rating: Number(product.averageRating) || 0, reviews: product.reviewCount,
    sales: product.salesCount.toLocaleString(), delivery: product.deliveryNote || (product.type === "DOWNLOAD" ? "Instant download" : "Seller delivery"),
    badge: product.salesCount > 50 ? "Popular" : "New", type: product.type,
    icon: ["✦", "@", "◎", "▶", "◆", "↗"][index % 6]
  };
}

export function useMarketplaceProducts() {
  const [products, setProducts] = useState<CatalogProduct[]>(catalogProducts);
  useEffect(() => {
    void apiRequest<{ products: ApiProduct[] }>("/api/marketplace/products?take=48")
      .then((data) => { if (data.products.length) setProducts(data.products.map(mapProduct)); })
      .catch(() => undefined);
  }, []);
  return products;
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
  const fallback = slug ? (awaitCategoryFallback(slug)) : undefined;
  const [category, setCategory] = useState<{name:string;description:string}|undefined>(fallback);
  const [loading, setLoading] = useState(!fallback);
  useEffect(() => {
    if (!slug) return;
    void apiRequest<{categories:Array<{slug:string;name:string;description:string}>}>("/api/marketplace/categories")
      .then((data) => { const match=data.categories.find((item)=>item.slug===slug); if(match)setCategory(match); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [slug]);
  return { category, loading };
}

function awaitCategoryFallback(slug:string) {
  const labels:Record<string,{name:string;description:string}> = {
    "social-media-kits": {name:"Social media kits",description:"Original templates, brand systems, content planners, and educational resources for legitimate social publishing."},
    "email-design": {name:"Email design",description:"Opt-in campaign templates, layouts, copy frameworks, and deliverability education."},
    "ai-workflows": {name:"AI workflows",description:"Vendor-neutral prompts, automations, and review systems."},
    "audio-video-assets": {name:"Audio & video assets",description:"Licensed music, motion graphics, editing assets, and production templates."},
    "game-assets": {name:"Game assets",description:"Original interface kits, sprites, audio, source files, and educational resources."},
    "expert-services": {name:"Expert services",description:"Protected, outcome-focused creative and technical services."}
  };
  return labels[slug];
}
