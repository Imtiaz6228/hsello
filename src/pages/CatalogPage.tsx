import {
  ArrowRight,
  ChevronDown,
  Grid2X2,
  List,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import {
  categoryMatches,
  productCategoryBuckets,
} from "../commerce/catalogHierarchy";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
} from "../commerce/useMarketplace";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { MarketplaceProductCard } from "../components/MarketplaceProductCard";
import { Seo } from "../components/Seo";
import type { CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";

type SortMode = "popular" | "price_asc" | "price_desc" | "newest";
type ViewMode = "list" | "grid";
type ProductKind = "all" | "DOWNLOAD" | "SERVICE";
type PriceBand = "all" | "under_25" | "25_50" | "over_50";

function sortProducts(products: CatalogProduct[], sort: SortMode) {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") return a.priceCents - b.priceCents;
    if (sort === "price_desc") return b.priceCents - a.priceCents;
    if (sort === "newest")
      return a.badge === "New"
        ? -1
        : b.badge === "New"
          ? 1
          : b.reviews - a.reviews;
    return (
      Number(String(b.sales).replace(/[^0-9.]/g, "")) -
        Number(String(a.sales).replace(/[^0-9.]/g, "")) || b.reviews - a.reviews
    );
  });
}

export function CatalogPage() {
  const { t } = useLocale();
  const { add } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQueryState] = useState(searchParams.get("q") ?? "");
  const [category, setCategoryState] = useState(
    searchParams.get("category") ?? "all",
  );
  const [expanded, setExpanded] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("popular");
  const [view, setView] = useState<ViewMode>("list");
  const [stockOnly, setStockOnly] = useState(false);
  const [kind, setKind] = useState<ProductKind>("all");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [minimumRating, setMinimumRating] = useState("all");
  const products = useMarketplaceProducts();
  const categories = useMarketplaceCategories();

  useEffect(() => {
    if (category === "all") {
      setExpanded("");
      return;
    }
    let current = categories.find((item) => item.slug === category);
    while (current?.parentSlug)
      current = categories.find((item) => item.slug === current?.parentSlug);
    setExpanded(current?.slug ?? "");
  }, [categories, category]);

  const parentCategories = useMemo(
    () => categories.filter((item) => !item.parentSlug),
    [categories],
  );
  const childrenByParent = useMemo(
    () =>
      new Map(
        parentCategories.map((parent) => [
          parent.slug,
          categories.filter((item) => item.parentSlug === parent.slug),
        ]),
      ),
    [categories, parentCategories],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      for (const bucket of productCategoryBuckets(
        product.categorySlug,
        categories,
      ))
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return counts;
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = products.filter((product) => {
      const isInStock =
        product.type === "SERVICE" || (product.stockCount ?? 0) > 0;
      return (
        categoryMatches(product.categorySlug, category, categories) &&
        (!stockOnly || isInStock) &&
        (kind === "all" || product.type === kind) &&
        (priceBand === "all" ||
          (priceBand === "under_25" && product.priceCents < 2500) ||
          (priceBand === "25_50" &&
            product.priceCents >= 2500 &&
            product.priceCents <= 5000) ||
          (priceBand === "over_50" && product.priceCents > 5000)) &&
        (minimumRating === "all" || product.rating >= Number(minimumRating)) &&
        (!normalizedQuery ||
          `${product.title} ${product.description} ${product.seller} ${product.category}`
            .toLowerCase()
            .includes(normalizedQuery))
      );
    });
    return sortProducts(matches, sort);
  }, [
    category,
    categories,
    kind,
    minimumRating,
    priceBand,
    products,
    query,
    sort,
    stockOnly,
  ]);

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

  const visibleParents = parentCategories.filter(
    (item) =>
      !categoryQuery.trim() ||
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(categoryQuery.toLowerCase()) ||
      (childrenByParent.get(item.slug) ?? []).some((child) =>
        `${child.name} ${child.description}`
          .toLowerCase()
          .includes(categoryQuery.toLowerCase()),
      ),
  );
  const activeCategory = categories.find((item) => item.slug === category);
  const activeFilterCount = [
    category !== "all",
    Boolean(query.trim()),
    stockOnly,
    kind !== "all",
    priceBand !== "all",
    minimumRating !== "all",
  ].filter(Boolean).length;

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStockOnly(false);
    setKind("all");
    setPriceBand("all");
    setMinimumRating("all");
  }

  return (
    <main className="commerce-page market-browse-page">
      <Seo
        title="Browse products and categories"
        description="Explore approved digital products and expert services by category, seller, price, delivery type, and availability on HSello."
        canonicalPath="/catalog"
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "HSello digital marketplace catalog",
          description:
            "Approved digital products and expert services with clear delivery and seller details.",
          url: `${window.location.origin}/catalog`,
        }}
      />
      <MarketHeader />
      <section className="catalog-hero market-browser-hero">
        <span className="section-index">
          {t("allCategories").toUpperCase()}
        </span>
        <h1>{t("browse")}</h1>
        <div className="catalog-search">
          <Search />
          <input
            aria-label="Search marketplace"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
          />
        </div>
      </section>
      <section className="mobile-category-pills" aria-label="Quick categories">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => setCategory("all")}
        >
          {t("allCategories")} <span>{products.length}</span>
        </button>
        {parentCategories.map((item) => (
          <button
            key={item.slug}
            className={category === item.slug ? "active" : ""}
            onClick={() => {
              setCategory(item.slug);
              setExpanded(item.slug);
            }}
          >
            {item.name}{" "}
            <span>
              {categoryCounts.get(item.slug) ?? item.productCount ?? 0}
            </span>
          </button>
        ))}
      </section>
      <section className="catalog-discovery-intro">
        <div className="catalog-section-heading">
          <div>
            <span className="section-index">
              <Sparkles /> CURATED DEPARTMENTS
            </span>
            <h2>Find the right digital product faster.</h2>
            <p>
              Browse professional assets, software, courses, creative tools, and
              seller-delivered services with clear licensing and delivery
              details.
            </p>
          </div>
          <Link to="/support">
            Buying guide <ArrowRight />
          </Link>
        </div>
        <div className="catalog-department-grid">
          {parentCategories.slice(0, 12).map((item) => (
            <button
              type="button"
              key={item.slug}
              className={category === item.slug ? "active" : ""}
              onClick={() => {
                setCategory(item.slug);
                setExpanded(item.slug);
                document
                  .querySelector(".market-browser-layout")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span>{item.icon}</span>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {(childrenByParent.get(item.slug) ?? []).length} specialties ·{" "}
                  {categoryCounts.get(item.slug) ?? item.productCount ?? 0}{" "}
                  products
                </small>
              </div>
              <ArrowRight />
            </button>
          ))}
        </div>
        <div className="catalog-confidence-row">
          <span>
            <ShieldCheck /> Clear licenses and delivery terms
          </span>
          <span>
            <ShieldCheck /> Moderated seller listings
          </span>
          <span>
            <ShieldCheck /> Order-linked support
          </span>
        </div>
      </section>
      <section className="market-browser-layout">
        <button
          type="button"
          className="mobile-catalog-filters-toggle"
          aria-expanded={mobileFiltersOpen}
          aria-controls="catalog-filter-directory"
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal />{" "}
          {mobileFiltersOpen
            ? "Hide filters & categories"
            : "Filters & categories"}
          {activeFilterCount ? <span>{activeFilterCount}</span> : null}
          <ChevronDown />
        </button>
        <aside
          id="catalog-filter-directory"
          className={`category-directory ${mobileFiltersOpen ? "mobile-open" : ""}`}
        >
          <div className="directory-card">
            <header>
              <strong>{t("allCategories")}</strong>
              <span>{categories.length}</span>
            </header>
            <label className="directory-check">
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(event) => setStockOnly(event.target.checked)}
              />{" "}
              {t("inStock")}
            </label>
            <div className="directory-filter-stack">
              <label>
                <span>Product type</span>
                <select
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as ProductKind)
                  }
                >
                  <option value="all">All products</option>
                  <option value="DOWNLOAD">Instant downloads</option>
                  <option value="SERVICE">Seller services</option>
                </select>
              </label>
              <label>
                <span>Price</span>
                <select
                  value={priceBand}
                  onChange={(event) =>
                    setPriceBand(event.target.value as PriceBand)
                  }
                >
                  <option value="all">Any price</option>
                  <option value="under_25">Under $25</option>
                  <option value="25_50">$25–$50</option>
                  <option value="over_50">Over $50</option>
                </select>
              </label>
              <label>
                <span>Rating</span>
                <select
                  value={minimumRating}
                  onChange={(event) => setMinimumRating(event.target.value)}
                >
                  <option value="all">Any rating</option>
                  <option value="4.5">4.5 and above</option>
                  <option value="4.8">4.8 and above</option>
                </select>
              </label>
            </div>
            <div className="directory-search">
              <Search />
              <input
                aria-label="Search categories"
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                placeholder="Search category name..."
              />
            </div>
            <button
              className={
                category === "all" ? "directory-all active" : "directory-all"
              }
              onClick={() => setCategory("all")}
            >
              {t("viewAll")} <span>{products.length}</span>
            </button>
          </div>
          <div className="directory-list">
            {visibleParents.map((parent) => {
              const children = childrenByParent.get(parent.slug) ?? [];
              const open = expanded === parent.slug;
              return (
                <div
                  className={`directory-group ${open ? "open" : ""}`}
                  key={parent.slug}
                >
                  <button
                    className={category === parent.slug ? "active" : ""}
                    onClick={() => {
                      setExpanded(open ? "" : parent.slug);
                      setCategory(parent.slug);
                    }}
                  >
                    <span className="cat-icon">{parent.icon}</span>
                    <strong>{parent.name}</strong>
                    <small>
                      {categoryCounts.get(parent.slug) ??
                        parent.productCount ??
                        0}
                    </small>
                    <ChevronDown />
                  </button>
                  {open ? (
                    <div className="subcategory-chip-list">
                      <Link to={`/categories/${parent.slug}`}>→ View All</Link>
                      {children.map((child) => (
                        <button
                          type="button"
                          className={category === child.slug ? "active" : ""}
                          key={child.slug}
                          onClick={() => setCategory(child.slug)}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>
        <div className="market-results-panel">
          <div className="catalog-results-context">
            <div>
              <span>{activeCategory?.icon ?? "✦"}</span>
              <div>
                <small>
                  {activeCategory ? "SELECTED CATEGORY" : "ALL PRODUCTS"}
                </small>
                <strong>{activeCategory?.name ?? "Marketplace catalog"}</strong>
                <p>
                  {activeCategory?.description ??
                    "Explore every department or narrow the catalog with precise filters."}
                </p>
              </div>
            </div>
            {activeFilterCount ? (
              <button type="button" onClick={clearFilters}>
                <RotateCcw /> Reset {activeFilterCount} filter
                {activeFilterCount === 1 ? "" : "s"}
              </button>
            ) : null}
          </div>
          <div className="market-filter-bar">
            <div>
              <strong>{filteredProducts.length}</strong>
              <span>{activeCategory ? activeCategory.name : "products"}</span>
            </div>
            <div className="filter-controls">
              <label>
                <SlidersHorizontal />{" "}
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                >
                  <option value="popular">Default - Popular</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List />
              </button>
              <button
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <Grid2X2 />
              </button>
            </div>
          </div>
          {activeFilterCount ? (
            <div className="active-filter-summary" role="status">
              <span>
                Showing {filteredProducts.length} matched product
                {filteredProducts.length === 1 ? "" : "s"}
              </span>
              {query.trim() ? (
                <button onClick={() => setQuery("")}>
                  Search: “{query.trim()}” ×
                </button>
              ) : null}
              {category !== "all" ? (
                <button onClick={() => setCategory("all")}>
                  {activeCategory?.name} ×
                </button>
              ) : null}
              {kind !== "all" ? (
                <button onClick={() => setKind("all")}>
                  {kind === "DOWNLOAD" ? "Downloads" : "Services"} ×
                </button>
              ) : null}
              {priceBand !== "all" ? (
                <button onClick={() => setPriceBand("all")}>
                  Price filter ×
                </button>
              ) : null}
              {minimumRating !== "all" ? (
                <button onClick={() => setMinimumRating("all")}>
                  {minimumRating}+ rating ×
                </button>
              ) : null}
              {stockOnly ? (
                <button onClick={() => setStockOnly(false)}>In stock ×</button>
              ) : null}
            </div>
          ) : null}
          <div
            className={`market-product-scroll ${view === "grid" ? "grid" : ""}`}
          >
            {filteredProducts.map((product) => (
              <MarketplaceProductCard
                key={product.id}
                product={product}
                onBuy={addToCart}
                layout={view}
              />
            ))}
          </div>
          {!filteredProducts.length ? (
            <div className="no-results">
              <Search />
              <strong>No matching products</strong>
              <span>
                Try another category, remove the stock filter, or use a broader
                phrase.
              </span>
              <button type="button" onClick={clearFilters}>
                Clear all filters
              </button>
            </div>
          ) : null}
        </div>
      </section>
      <MarketFooter />
    </main>
  );
}
