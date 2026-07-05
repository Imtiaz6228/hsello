import { useMemo, useState } from "react";
import { BadgeCheck, Check, Clock3, Download, Flag, MessageCircle, RefreshCw, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useMarketplaceProduct } from "../commerce/useMarketplace";

export function ProductPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const { product, loading } = useMarketplaceProduct(slug);
  const schema = useMemo(() => product ? ({
    "@context": "https://schema.org", "@type": "Product", name: product.title,
    description: product.description, sku: product.id, category: product.category,
    offers: { "@type": "Offer", price: (product.priceCents / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews }
  }) : undefined, [product]);

  if (loading) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading product…</p></main>;
  if (!product) return <Navigate to="/catalog" replace />;

  function addToCart() {
    add(product!); setAdded(true); window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <main className="commerce-page">
      <Seo title={product.title} description={product.description} canonicalPath={`/products/${product.slug}`} schema={schema} />
      <MarketHeader />
      <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to={`/categories/${product.categorySlug}`}>{product.category}</Link><span>/</span><span>{product.title}</span></div>
      <section className="product-detail">
        <div className="product-detail-art"><span>{product.badge}</span><b>{product.icon}</b><small>ORIGINAL DIGITAL WORK</small></div>
        <div className="product-detail-copy">
          <span className="section-index">{product.category}</span>
          <h1>{product.title}</h1>
          <div className="detail-rating"><Star fill="currentColor" /> <strong>{product.rating}</strong><span>{product.reviews} verified reviews</span><span>·</span><span>{product.sales} sales</span></div>
          <p>{product.longDescription}</p>
          <Link className="seller-identity" to={`/stores/${product.sellerSlug}`}><span>{product.seller.slice(0, 2).toUpperCase()}</span><div><small>SOLD BY</small><strong>{product.seller} <BadgeCheck /></strong></div></Link>
          <div className="detail-highlights">
            <span><Clock3 /> {product.delivery}</span>
            <span><RefreshCw /> Updated files included</span>
            <span><ShieldCheck /> Buyer protection</span>
            {product.type === "DOWNLOAD" ? <span><Download /> 5 protected downloads</span> : <span><MessageCircle /> Protected delivery chat</span>}
          </div>
        </div>
        <aside className="buy-panel">
          <span>One-time purchase</span><strong>${(product.priceCents / 100).toFixed(2)}</strong><small>USD · taxes shown at checkout</small>
          <button type="button" onClick={addToCart}>{added ? <Check /> : <ShoppingBag />}{added ? "Added to cart" : "Add to cart"}</button>
          <Link to="/cart">View cart</Link>
          <ul><li><Check /> Secure payment confirmation</li><li><Check /> Invoice included</li><li><Check /> Support if anything goes wrong</li></ul>
        </aside>
      </section>

      <section className="detail-section review-showcase">
        <div><span className="section-index">VERIFIED REVIEWS</span><h2>Buyers know what arrived.</h2><p>Only customers with a paid order can publish a review. Sellers can respond, and abusive content enters moderation.</p></div>
        <div className="review-cards">
          <article><span>★★★★★</span><p>“Clear files, thoughtful organization, and exactly the license I expected.”</p><small>Verified buyer · 3 weeks ago</small></article>
          <article><span>★★★★★</span><p>“The update appeared in my library automatically. That part is genuinely lovely.”</p><small>Verified buyer · 1 month ago</small></article>
        </div>
      </section>

      <section className="report-line"><Flag /><div><strong>Something doesn’t look right?</strong><span>Account trading, stolen work, credentials, hacking tools, spam, and fake-review services are prohibited.</span></div><Link to={user ? "/support" : "/sign-in"}>Report product</Link></section>
      <MarketFooter />
    </main>
  );
}
