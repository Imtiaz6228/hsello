import { ArrowRight, Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "../commerce/CartContext";
import { useMarketplaceCategories, useMarketplaceProducts } from "../commerce/useMarketplace";
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
  function addToCart(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  const productState = useMarketplaceProducts(slug ? `category=${encodeURIComponent(slug)}` : "");
  const categoryState = useMarketplaceCategories();
  const { products } = productState;
  const { categories, loading } = categoryState;
  const category = categories.find((item) => item.slug === slug);
  const children = useMemo(() => categories.filter((item) => item.parentSlug === slug), [categories, slug]);
  const siblings = useMemo(() => categories.filter((item) => !item.parentSlug && item.slug !== slug).slice(0, 8), [categories, slug]);

  const filteredProducts = useMemo(() => {
    if (!slug) return [];
    const matches = products.filter((product) => {
      const productCategory = categories.find((item) => item.slug === product.categorySlug);
      const inCurrent = product.categorySlug === slug || productCategory?.parentSlug === slug;
      const inSubFilter = subFilter === "all" || product.categorySlug === subFilter;
      return inCurrent && inSubFilter;
    });
    return sortProducts(matches, sort);
  }, [categories, products, slug, sort, subFilter]);

  if (loading) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading category…</p></main>;
  if (categoryState.error) return <main className="commerce-page"><MarketHeader /><div className="status-panel error" role="alert"><strong>Category unavailable</strong><span>{categoryState.error}</span><button type="button" onClick={categoryState.retry}>Try again</button></div><MarketFooter /></main>;
  if (!category || !slug) return <Navigate to="/catalog" replace />;

  return (
    <main className="commerce-page market-browse-page">
      <Seo title={category.name} description={category.description} canonicalPath={`/categories/${slug}`} />
      <MarketHeader />
      <section className="category-landing category-market-heading">
        <span className="section-index">CATEGORY</span>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
        <div><ShieldLine /><span>Buyers can scroll products here; sellers can add products and request new categories from Seller Studio.</span></div>
      </section>
      {children.length ? <section className="subcategory-strip"><button className={subFilter === "all" ? "active" : ""} onClick={() => setSubFilter("all")}>All</button>{children.map((child) => <button key={child.slug} className={subFilter === child.slug ? "active" : ""} onClick={() => setSubFilter(child.slug)}>{child.name}</button>)}</section> : null}
      <section className="category-product-shell">
        {productState.error ? <div className="status-panel error" role="alert"><strong>Products could not be loaded.</strong><span>{productState.error}</span><button type="button" onClick={productState.retry}>Try again</button></div> : null}
        {productState.loading ? <div className="product-skeleton-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div> : null}
        <div className="market-filter-bar">
          <div><strong>{filteredProducts.length}</strong><span>products</span></div>
          <div className="filter-controls">
            <label><SlidersHorizontal /> <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="popular">Default - Popular</option><option value="price_asc">Price: Low → High</option><option value="price_desc">Price: High → Low</option><option value="newest">Newest</option></select></label>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List /></button>
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 /></button>
          </div>
        </div>
        <div className={`market-product-scroll ${view === "grid" ? "grid" : ""}`}>{!productState.loading ? filteredProducts.map((product) => <MarketplaceProductCard key={product.id} product={product} onBuy={addToCart} layout={view} />) : null}</div>
        {!productState.loading && !productState.error && !filteredProducts.length ? <div className="no-results"><Search /><strong>No products yet</strong><span>Try another subcategory or return to all categories.</span></div> : null}
        {productState.hasNextPage ? <button className="load-more-button" type="button" disabled={productState.loadingMore} onClick={() => void productState.loadMore()}>{productState.loadingMore ? "Loading more…" : "Load more products"}</button> : null}
      </section>
      <section className="internal-links"><strong>Keep exploring</strong>{siblings.map((item) => <Link to={`/categories/${item.slug}`} key={item.slug}>{item.name}<ArrowRight /></Link>)}</section>
      <MarketFooter />
    </main>
  );
}

function ShieldLine() { return <span aria-hidden="true">✓</span>; }
