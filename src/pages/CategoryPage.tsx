import { ArrowRight, BadgeCheck, Clock3, Grid2X2, List, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { useCart } from "../commerce/CartContext";
import { useMarketplaceCategories, useMarketplaceCategory, useMarketplaceProducts } from "../commerce/useMarketplace";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { MarketplaceProductCard } from "../components/MarketplaceProductCard";
import { Seo } from "../components/Seo";
import type { CatalogProduct } from "../data/catalog";

type SortMode = "popular" | "price_asc" | "price_desc" | "newest";
type ViewMode = "list" | "grid";

function sortProducts(products: CatalogProduct[], sort: SortMode) {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") return a.priceCents - b.priceCents;
    if (sort === "price_desc") return b.priceCents - a.priceCents;
    if (sort === "newest") return a.badge === "New" ? -1 : b.badge === "New" ? 1 : b.reviews - a.reviews;
    return b.reviews - a.reviews;
  });
}

export function CategoryPage() {
  const { slug } = useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortMode>("popular");
  const [view, setView] = useState<ViewMode>("list");
  const [subFilter, setSubFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "DOWNLOAD" | "SERVICE">("all");
  function addToCart(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  const products = useMarketplaceProducts();
  const categories = useMarketplaceCategories();
  const { category, loading } = useMarketplaceCategory(slug);
  const children = useMemo(() => categories.filter((item) => item.parentSlug === slug), [categories, slug]);
  const siblings = useMemo(() => categories.filter((item) => !item.parentSlug && item.slug !== slug).slice(0, 8), [categories, slug]);
  const isDescendant = useCallback((candidate: string, ancestor: string) => {
    let current = categories.find((item) => item.slug === candidate);
    while (current?.parentSlug) {
      if (current.parentSlug === ancestor) return true;
      current = categories.find((item) => item.slug === current?.parentSlug);
    }
    return candidate === ancestor;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (!slug) return [];
    const matches = products.filter((product) => {
      const inCurrent = isDescendant(product.categorySlug, slug);
      const inSubFilter = subFilter === "all" || isDescendant(product.categorySlug, subFilter);
      const matchesQuery = !query.trim() || `${product.title} ${product.description} ${product.seller}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesKind = kind === "all" || product.type === kind;
      return inCurrent && inSubFilter && matchesQuery && matchesKind;
    });
    return sortProducts(matches, sort);
  }, [isDescendant, kind, products, query, slug, sort, subFilter]);

  const categoryProducts = useMemo(() => products.filter((product) => {
    return Boolean(slug && isDescendant(product.categorySlug, slug));
  }), [isDescendant, products, slug]);

  if (loading) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading category…</p></main>;
  if (!category || !slug) return <Navigate to="/catalog" replace />;

  return (
    <main className="commerce-page market-browse-page">
      <Seo title={category.name} description={category.description} canonicalPath={`/categories/${slug}`} />
      <MarketHeader />
      <section className="category-landing category-market-heading">
        <div className="category-heading-copy">
          <span className="section-index">DIGITAL DEPARTMENT</span>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
          <div className="category-trust-line"><ShieldLine /><span>Every listing shows its delivery method, seller support window, and usage terms before purchase.</span></div>
        </div>
        <aside className="category-hero-facts">
          <div><strong>{categoryProducts.length}</strong><span>curated products</span></div>
          <div><strong>{children.length}</strong><span>specialties</span></div>
          <div><strong>{categoryProducts.filter((product) => product.type === "DOWNLOAD").length}</strong><span>instant downloads</span></div>
        </aside>
      </section>
      {children.length ? (
        <section className="category-specialty-grid" aria-label={`${category.name} specialties`}>
          {children.map((child) => {
            const count = categoryProducts.filter((product) => product.categorySlug === child.slug).length;
            return <button type="button" className={subFilter === child.slug ? "active" : ""} key={child.slug} onClick={() => setSubFilter(child.slug)}><span>{child.icon}</span><div><strong>{child.name}</strong><small>{child.description}</small><b>{count} product{count === 1 ? "" : "s"}</b></div><ArrowRight /></button>;
          })}
        </section>
      ) : null}
      {children.length ? <section className="subcategory-strip"><button className={subFilter === "all" ? "active" : ""} onClick={() => setSubFilter("all")}>All</button>{children.map((child) => <button key={child.slug} className={subFilter === child.slug ? "active" : ""} onClick={() => setSubFilter(child.slug)}>{child.name}</button>)}</section> : null}
      <section className="category-product-shell">
        <div className="category-assurance-row">
          <span><BadgeCheck /> Moderated listings</span>
          <span><Clock3 /> Delivery shown upfront</span>
          <span><ShieldCheck /> Order-linked support</span>
        </div>
        <div className="market-filter-bar">
          <div><strong>{filteredProducts.length}</strong><span>products found</span></div>
          <div className="filter-controls">
            <label className="category-inline-search"><Search /><input aria-label={`Search ${category.name}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${category.name}`} /></label>
            <label><select value={kind} onChange={(event) => setKind(event.target.value as "all" | "DOWNLOAD" | "SERVICE")}><option value="all">All types</option><option value="DOWNLOAD">Downloads</option><option value="SERVICE">Services</option></select></label>
            <label><SlidersHorizontal /> <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="popular">Default - Popular</option><option value="price_asc">Price: Low → High</option><option value="price_desc">Price: High → Low</option><option value="newest">Newest</option></select></label>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List /></button>
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 /></button>
          </div>
        </div>
        <div className={`market-product-scroll ${view === "grid" ? "grid" : ""}`}>{filteredProducts.map((product) => <MarketplaceProductCard key={product.id} product={product} onBuy={addToCart} layout={view} />)}</div>
        {!filteredProducts.length ? <div className="no-results"><Search /><strong>No matching products</strong><span>Try another specialty, remove a filter, or return to the complete catalog.</span><button type="button" onClick={() => { setQuery(""); setKind("all"); setSubFilter("all"); }}>Clear filters</button></div> : null}
      </section>
      <section className="internal-links"><strong>Keep exploring</strong>{siblings.map((item) => <Link to={`/categories/${item.slug}`} key={item.slug}>{item.name}<ArrowRight /></Link>)}</section>
      <MarketFooter />
    </main>
  );
}

function ShieldLine() { return <span aria-hidden="true">✓</span>; }
