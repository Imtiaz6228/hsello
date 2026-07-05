import { Search, ShoppingBag, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { catalogProducts, categoryDescriptions } from "../data/catalog";
import { useMarketplaceProducts } from "../commerce/useMarketplace";

export function CatalogPage() {
  const { add } = useCart(); const [query, setQuery] = useState(""); const [category, setCategory] = useState("all");
  const liveProducts = useMarketplaceProducts();
  const products = useMemo(() => liveProducts.filter((product) => (category === "all" || product.categorySlug === category) && (!query.trim() || `${product.title} ${product.description} ${product.seller}`.toLowerCase().includes(query.toLowerCase()))), [category, query, liveProducts]);
  return <main className="commerce-page"><Seo title="Digital product marketplace" description="Browse reviewed templates, creative assets, AI workflows, game assets, and expert services from verified sellers." canonicalPath="/catalog" /><MarketHeader />
    <section className="catalog-hero"><span className="section-index">THE FULL MARKET</span><h1>Original work.<br />Useful outcomes.</h1><div className="catalog-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products and sellers" /></div></section>
    <section className="catalog-shell"><aside><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>All products <span>{catalogProducts.length}</span></button>{Object.entries(categoryDescriptions).map(([key, value]) => <button className={category === key ? "active" : ""} onClick={() => setCategory(key)} key={key}>{value.name}<span>{catalogProducts.filter((product) => product.categorySlug === key).length}</span></button>)}</aside>
      <div><header><strong>{products.length} curated products</strong><span>Reviewed before publishing</span></header><div className="catalog-product-grid">{products.map((product) => <article key={product.id}><Link className="catalog-product-art" to={`/products/${product.slug}`}><span>{product.badge}</span><b>{product.icon}</b></Link><div><span>{product.category}</span><Link to={`/products/${product.slug}`}><h2>{product.title}</h2></Link><p>{product.description}</p><div className="catalog-rating"><Star fill="currentColor" /> {product.rating} <small>({product.reviews})</small></div><footer><strong>${(product.priceCents / 100).toFixed(2)}</strong><button onClick={() => add(product)}><ShoppingBag /> Add</button></footer></div></article>)}</div>{!products.length ? <div className="no-results"><Search /><strong>No matching products</strong><span>Try another category or a broader phrase.</span></div> : null}</div>
    </section><MarketFooter />
  </main>;
}
