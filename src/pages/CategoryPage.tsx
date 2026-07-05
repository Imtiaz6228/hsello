import { ArrowRight, ShoppingBag, Star } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { catalogProducts, categoryDescriptions } from "../data/catalog";
import { useMarketplaceCategory, useMarketplaceProducts } from "../commerce/useMarketplace";

export function CategoryPage() {
  const { slug } = useParams();
  const { add } = useCart();
  const liveProducts = useMarketplaceProducts();
  const { category, loading } = useMarketplaceCategory(slug);
  if (loading) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading category…</p></main>;
  if (!category || !slug) return <Navigate to="/catalog" replace />;
  const products = liveProducts.filter((product) => product.categorySlug === slug);
  return <main className="commerce-page"><Seo title={category.name} description={category.description} canonicalPath={`/categories/${slug}`} /><MarketHeader />
    <section className="category-landing"><span className="section-index">CURATED CATEGORY</span><h1>{category.name}</h1><p>{category.description}</p><div><ShieldLine /><span>Every product is reviewed before publishing.</span></div></section>
    <section className="catalog-product-grid">{products.map((product) => <article key={product.id}><Link className="catalog-product-art" to={`/products/${product.slug}`}><span>{product.badge}</span><b>{product.icon}</b></Link><div><span>{product.category}</span><Link to={`/products/${product.slug}`}><h2>{product.title}</h2></Link><p>{product.description}</p><div className="catalog-rating"><Star fill="currentColor" /> {product.rating} <small>({product.reviews})</small></div><footer><strong>${(product.priceCents / 100).toFixed(2)}</strong><button onClick={() => add(product)}><ShoppingBag /> Add</button></footer></div></article>)}</section>
    <section className="internal-links"><strong>Keep exploring</strong>{Object.entries(categoryDescriptions).filter(([key]) => key !== slug).map(([key, value]) => <Link to={`/categories/${key}`} key={key}>{value.name}<ArrowRight /></Link>)}</section><MarketFooter />
  </main>;
}

function ShieldLine() { return <span aria-hidden="true">✓</span>; }
