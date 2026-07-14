import { ChevronDown, Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { useMarketplaceCategories, useMarketplaceProducts } from "../commerce/useMarketplace";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { MarketplaceProductCard } from "../components/MarketplaceProductCard";
import { Seo } from "../components/Seo";
import type { CatalogCategory, CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";

type SortMode = "popular" | "price_asc" | "price_desc" | "newest";
type ViewMode = "list" | "grid";

function productMatchesCategory(product: CatalogProduct, selected: string, categories: CatalogCategory[]) {
  if (selected === "all") return true;
  if (product.categorySlug === selected) return true;
  const productCategory = categories.find((category) => category.slug === product.categorySlug);
  return productCategory?.parentSlug === selected;
}

function sortProducts(products: CatalogProduct[], sort: SortMode) {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") return a.priceCents - b.priceCents;
    if (sort === "price_desc") return b.priceCents - a.priceCents;
    if (sort === "newest") return a.badge === "New" ? -1 : b.badge === "New" ? 1 : b.reviews - a.reviews;
    return Number(String(b.sales).replace(/[^0-9.]/g, "")) - Number(String(a.sales).replace(/[^0-9.]/g, "")) || b.reviews - a.reviews;
  });
}

export function CatalogPage() {
  const { t } = useLocale();
  const { add } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQueryState] = useState(searchParams.get("q") ?? "");
  const [category, setCategoryState] = useState(searchParams.get("category") ?? "all");
  const [expanded, setExpanded] = useState("instagram");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("popular");
  const [view, setView] = useState<ViewMode>("list");
  const [stockOnly, setStockOnly] = useState(false);
  const marketplaceQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    params.set("sort", sort);
    params.set("stock", stockOnly ? "in_stock" : "all");
    return params.toString();
  }, [category, query, sort, stockOnly]);
  const productState = useMarketplaceProducts(marketplaceQuery);
  const categoryState = useMarketplaceCategories();
  const { products } = productState;
  const { categories } = categoryState;

  const parentCategories = useMemo(() => categories.filter((item) => !item.parentSlug), [categories]);
  const childrenByParent = useMemo(() => new Map(parentCategories.map((parent) => [parent.slug, categories.filter((item) => item.parentSlug === parent.slug)])), [categories, parentCategories]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.categorySlug, (counts.get(product.categorySlug) ?? 0) + 1);
      const productCategory = categories.find((item) => item.slug === product.categorySlug);
      if (productCategory?.parentSlug) counts.set(productCategory.parentSlug, (counts.get(productCategory.parentSlug) ?? 0) + 1);
    }
    return counts;
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = products.filter((product) => {
      const isInStock = product.type === "SERVICE" || (product.stockCount ?? 0) > 0;
      return productMatchesCategory(product, category, categories)
        && (!stockOnly || isInStock)
        && (!normalizedQuery || `${product.title} ${product.description} ${product.seller} ${product.category}`.toLowerCase().includes(normalizedQuery));
    });
    return sortProducts(matches, sort);
  }, [category, categories, products, query, sort, stockOnly]);

  function addToCart(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  function setQuery(value: string) {
    setQueryState(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }

  function setCategory(value: string) {
    setCategoryState(value);
    const next = new URLSearchParams(searchParams);
    if (value !== "all") next.set("category", value);
    else next.delete("category");
    setSearchParams(next, { replace: true });
  }

  const visibleParents = parentCategories.filter((item) => !categoryQuery.trim() || `${item.name} ${item.description}`.toLowerCase().includes(categoryQuery.toLowerCase()) || (childrenByParent.get(item.slug) ?? []).some((child) => `${child.name} ${child.description}`.toLowerCase().includes(categoryQuery.toLowerCase())));
  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <main className="commerce-page market-browse-page">
      <Seo title="Browse products and categories" description="Scrollable marketplace categories, subcategories, stocked digital products, and secure buying from verified sellers." canonicalPath="/catalog" />
      <MarketHeader />
      <section className="catalog-hero market-browser-hero">
        <span className="section-index">{t("allCategories").toUpperCase()}</span>
        <h1>{t("browse")}</h1>
        <div className="catalog-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} /></div>
      </section>
      <section className="mobile-category-pills" aria-label="Quick categories">
        <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>{t("allCategories")} <span>{products.length}</span></button>
        {parentCategories.map((item) => <button key={item.slug} className={category === item.slug ? "active" : ""} onClick={() => { setCategory(item.slug); setExpanded(item.slug); }}>{item.name} <span>{categoryCounts.get(item.slug) ?? item.productCount ?? 0}</span></button>)}
      </section>
      <section className="market-browser-layout">
        <aside className="category-directory">
          <div className="directory-card">
            <header><strong>{t("allCategories")}</strong><span>{categories.length}</span></header>
            <label className="directory-check"><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} /> {t("inStock")}</label>
            <div className="directory-search"><Search /><input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="Search category name..." /></div>
            <button className={category === "all" ? "directory-all active" : "directory-all"} onClick={() => setCategory("all")}>{t("viewAll")} <span>{products.length}</span></button>
          </div>
          <div className="directory-list">
            {visibleParents.map((parent) => {
              const children = childrenByParent.get(parent.slug) ?? [];
              const open = expanded === parent.slug;
              return (
                <div className={`directory-group ${open ? "open" : ""}`} key={parent.slug}>
                  <button className={category === parent.slug ? "active" : ""} onClick={() => { setExpanded(open ? "" : parent.slug); setCategory(parent.slug); }}>
                    <span className="cat-icon">{parent.icon}</span><strong>{parent.name}</strong><small>{categoryCounts.get(parent.slug) ?? parent.productCount ?? 0}</small><ChevronDown />
                  </button>
                  {open ? <div className="subcategory-chip-list"><Link to={`/categories/${parent.slug}`}>→ View All</Link>{children.map((child) => <button type="button" className={category === child.slug ? "active" : ""} key={child.slug} onClick={() => setCategory(child.slug)}>{child.name}</button>)}</div> : null}
                </div>
              );
            })}
          </div>
        </aside>
        <div className="market-results-panel">
          {productState.error || categoryState.error ? <div className="status-panel error" role="alert"><strong>Marketplace data is temporarily unavailable.</strong><span>{productState.error ?? categoryState.error}</span><button type="button" onClick={() => { productState.retry(); categoryState.retry(); }}>Try again</button></div> : null}
          {productState.loading ? <div className="product-skeleton-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div> : null}
          <div className="market-filter-bar">
            <div><strong>{filteredProducts.length}</strong><span>{activeCategory ? activeCategory.name : "products"}</span></div>
            <div className="filter-controls">
              <label><SlidersHorizontal /> <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="popular">Default - Popular</option><option value="price_asc">Price: Low → High</option><option value="price_desc">Price: High → Low</option><option value="newest">Newest</option></select></label>
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List /></button>
              <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 /></button>
            </div>
          </div>
          <div className={`market-product-scroll ${view === "grid" ? "grid" : ""}`}>
            {!productState.loading ? filteredProducts.map((product) => <MarketplaceProductCard key={product.id} product={product} onBuy={addToCart} layout={view} />) : null}
          </div>
          {!productState.loading && !productState.error && !filteredProducts.length ? <div className="no-results"><Search /><strong>No matching products</strong><span>Try another category, remove the stock filter, or use a broader phrase.</span></div> : null}
          {productState.hasNextPage ? <button className="load-more-button" type="button" disabled={productState.loadingMore} onClick={() => void productState.loadMore()}>{productState.loadingMore ? "Loading more…" : "Load more products"}</button> : null}
        </div>
      </section>
      <MarketFooter />
    </main>
  );
}
