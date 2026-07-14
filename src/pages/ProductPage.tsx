import { useMemo, useState } from "react";
import { BadgeCheck, Check, Clock3, Download, Flag, MessageCircle, RefreshCw, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useMarketplaceProduct } from "../commerce/useMarketplace";
import { useLocale } from "../i18n/LocaleContext";

export function ProductPage() {
  const { formatMoney, currency } = useLocale();
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { product, loading, error } = useMarketplaceProduct(slug);
  const schema = useMemo(() => product ? ({
    "@context": "https://schema.org", "@type": "Product", name: product.title,
    description: product.description, sku: product.id, category: product.category,
    brand: { "@type": "Brand", name: product.seller },
    offers: { "@type": "Offer", price: (product.priceCents / 100).toFixed(2), priceCurrency: "USD", availability: product.type === "SERVICE" || (product.stockCount ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${location.origin}/products/${product.slug}` },
    ...(product.reviews > 0 && product.rating > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } } : {})
  }) : undefined, [product]);

  if (loading) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading product…</p></main>;
  if (error) return <main className="commerce-page"><MarketHeader /><div className="status-panel error" role="alert"><strong>Product unavailable</strong><span>{error}</span><Link to="/catalog">Return to catalog</Link></div><MarketFooter /></main>;
  if (!product) return <Navigate to="/catalog" replace />;

  function addToCart() {
    add(product!); setAdded(true); navigate("/cart");
  }

  return (
    <main className="commerce-page">
      <Seo title={product.title} description={product.description} canonicalPath={`/products/${product.slug}`} schema={schema} />
      <MarketHeader />
      <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to={`/categories/${product.categorySlug}`}>{product.category}</Link><span>/</span><span>{product.title}</span></div>
      <section className="product-detail">
        <div className="product-detail-art">{product.imageUrl && !imageFailed ? <img src={product.imageUrl} alt="" width="900" height="675" onError={() => setImageFailed(true)} /> : <b>{product.icon}</b>}<span>{product.badge}</span><small>REVIEWED LISTING</small></div>
        <div className="product-detail-copy">
          <span className="section-index">{product.category}</span>
          <h1>{product.title}</h1>
          <div className="detail-rating"><Star fill="currentColor" /> <strong>{product.rating}</strong><span>{product.reviews} verified reviews</span><span>·</span><span>{product.sales} sales</span></div>
          <p>{product.longDescription}</p>
          <Link className="seller-identity" to={`/stores/${product.sellerSlug}`}><span>{product.seller.slice(0, 2).toUpperCase()}</span><div><small>SOLD BY</small><strong>{product.seller} <BadgeCheck /></strong></div></Link>
          <div className="detail-highlights">
            <span><Clock3 /> {product.delivery}</span>
            {product.buyersGetUpdates ? <span><RefreshCw /> Updated files included</span> : null}
            <span><ShieldCheck /> Buyer protection</span>
            <span><RefreshCw /> {product.afterSalesServiceHours ?? 12}h after-sales dispute window</span>
            {product.type === "DOWNLOAD" ? <span><Download /> {product.downloadLimit ?? 5} protected downloads</span> : <span><MessageCircle /> Protected delivery chat</span>}
          </div>
        </div>
        <aside className="buy-panel">
          <span>One-time purchase</span><strong>{formatMoney(product.priceCents)}</strong><small>{currency} display · charged from the USD base price</small>
          <button type="button" onClick={addToCart}>{added ? <Check /> : <ShoppingBag />}{added ? "Added to cart" : "Add to cart"}</button>
          <Link to="/cart">View cart</Link>
          <ul><li><Check /> Secure payment confirmation</li><li><Check /> Invoice included</li><li><Check /> Support if anything goes wrong</li></ul>
        </aside>
      </section>

      <section className="detail-section review-showcase">
        <div><span className="section-index">VERIFIED REVIEWS</span><h2>Buyers know what arrived.</h2><p>Only customers with a paid order can publish a review. Sellers can respond, and abusive content enters moderation.</p></div>
        {product.verifiedReviews?.length ? <div className="review-cards">{product.verifiedReviews.map((review) => <article key={review.id}><span aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><p>{review.body}</p><small>{review.buyerName} · Verified buyer · {new Date(review.createdAt).toLocaleDateString()}</small>{review.sellerResponse ? <div className="seller-review-response"><strong>Seller response</strong><p>{review.sellerResponse}</p></div> : null}</article>)}</div> : <div className="no-results"><Star /><strong>No reviews yet</strong><span>Verified buyer reviews will appear here after completed orders.</span></div>}
      </section>

      <section className="report-line"><Flag /><div><strong>Something doesn’t look right?</strong><span>Account trading, stolen work, credentials, hacking tools, spam, and fake-review services are prohibited.</span></div><Link to={user ? "/support" : "/sign-in"}>Report product</Link></section>
      <MarketFooter />
    </main>
  );
}
