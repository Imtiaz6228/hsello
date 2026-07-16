import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock3,
  Download,
  FileArchive,
  Flag,
  Globe2,
  Layers3,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useMarketplaceProduct, useMarketplaceProducts } from "../commerce/useMarketplace";
import { useLocale } from "../i18n/LocaleContext";
import { MarketplaceProductCard } from "../components/MarketplaceProductCard";
import type { CatalogProduct } from "../data/catalog";

export function ProductPage() {
  const { formatMoney, currency } = useLocale();
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [artMode, setArtMode] = useState<"cover" | "contents" | "license">("cover");
  const { product, loading } = useMarketplaceProduct(slug);
  const marketplaceProducts = useMarketplaceProducts();
  const relatedProducts = useMemo(() => marketplaceProducts.filter((item) => item.id !== product?.id && (item.categorySlug === product?.categorySlug || item.type === product?.type)).slice(0, 4), [marketplaceProducts, product]);
  const schema = useMemo(
    () =>
      product
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            sku: product.id,
            category: product.category,
            offers: {
              "@type": "Offer",
              price: (product.priceCents / 100).toFixed(2),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.rating,
              reviewCount: product.reviews,
            },
          }
        : undefined,
    [product],
  );

  if (loading)
    return (
      <main className="commerce-page">
        <MarketHeader />
        <p className="empty-state">Loading product…</p>
      </main>
    );
  if (!product) return <Navigate to="/catalog" replace />;

  function addToCart() {
    add(product!);
    setAdded(true);
    navigate("/cart");
  }

  function addRelatedToCart(item: CatalogProduct) {
    add(item);
    navigate("/cart");
  }

  const included = product.included ?? (product.type === "DOWNLOAD"
    ? ["Primary digital product files", "Setup and usage guide", "Future file corrections"]
    : ["Seller-delivered project scope", "Written delivery summary", "Order-linked revision window"]);
  const formats = product.formats ?? (product.type === "DOWNLOAD" ? ["Digital files", "PDF guide"] : ["Protected order delivery"]);

  return (
    <main className="commerce-page">
      <Seo
        title={product.title}
        description={product.description}
        canonicalPath={`/products/${product.slug}`}
        type="product"
        schema={schema}
      />
      <MarketHeader />
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/categories/${product.categorySlug}`}>
          {product.category}
        </Link>
        <span>/</span>
        <span>{product.title}</span>
      </div>
      <section className="product-detail">
        <div className="product-gallery">
          <div className={`product-detail-art product-art-${artMode}`}>
            {artMode === "cover" ? (
              product.imageUrl && !imageFailed ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  decoding="async"
                  fetchPriority="high"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <b>{product.icon}</b>
              )
            ) : artMode === "contents" ? (
              <div className="product-art-information"><PackageCheck /><small>WHAT IS INCLUDED</small><strong>{included.length} ready-to-use deliverables</strong><span>{included.join(" · ")}</span></div>
            ) : (
              <div className="product-art-information"><ShieldCheck /><small>LICENSE & SUPPORT</small><strong>{product.license ?? "Standard marketplace license"}</strong><span>{product.afterSalesServiceHours ?? 24}-hour after-sales support window</span></div>
            )}
            <span>{product.badge}</span>
            <small>ORIGINAL DIGITAL WORK</small>
          </div>
          <div className="product-gallery-thumbs" aria-label="Product information views">
            <button className={artMode === "cover" ? "active" : ""} onClick={() => setArtMode("cover")}><span>{product.icon}</span><small>Preview</small></button>
            <button className={artMode === "contents" ? "active" : ""} onClick={() => setArtMode("contents")}><PackageCheck /><small>Included</small></button>
            <button className={artMode === "license" ? "active" : ""} onClick={() => setArtMode("license")}><ShieldCheck /><small>License</small></button>
          </div>
        </div>
        <div className="product-detail-copy">
          <span className="section-index">{product.category}</span>
          <h1>{product.title}</h1>
          <div className="detail-rating">
            <Star fill="currentColor" /> <strong>{product.rating}</strong>
            <span>{product.reviews} verified reviews</span>
            <span>·</span>
            <span>{product.sales} sales</span>
          </div>
          <p>{product.longDescription}</p>
          <Link
            className="seller-identity"
            to={`/stores/${product.sellerSlug}`}
          >
            <span>{product.seller.slice(0, 2).toUpperCase()}</span>
            <div>
              <small>SOLD BY</small>
              <strong>
                {product.seller} <BadgeCheck />
              </strong>
            </div>
          </Link>
          <div className="detail-highlights">
            <span>
              <Clock3 /> {product.delivery}
            </span>
            <span>
              <RefreshCw /> Updated files included
            </span>
            <span>
              <ShieldCheck /> Buyer protection
            </span>
            <span>
              <RefreshCw /> {product.afterSalesServiceHours ?? 12}h after-sales
              dispute window
            </span>
            {product.type === "DOWNLOAD" ? (
              <span>
                <Download /> 5 protected downloads
              </span>
            ) : (
              <span>
                <MessageCircle /> Protected delivery chat
              </span>
            )}
          </div>
          <div className="product-format-row">
            {formats.map((format) => <span key={format}>{format}</span>)}
          </div>
        </div>
        <aside className="buy-panel">
          <span>One-time purchase</span>
          <strong>{formatMoney(product.priceCents)}</strong>
          <small>{currency} display · charged from the USD base price</small>
          <button type="button" onClick={addToCart}>
            {added ? <Check /> : <ShoppingBag />}
            {added ? "Added to cart" : "Add to cart"}
          </button>
          <Link to="/cart">View cart</Link>
          <ul>
            <li>
              <Check /> Secure payment confirmation
            </li>
            <li>
              <Check /> Invoice included
            </li>
            <li>
              <Check /> Support if anything goes wrong
            </li>
          </ul>
        </aside>
      </section>

      <section className="product-information-grid">
        <article className="product-included-card">
          <span className="section-index">PACKAGE CONTENTS</span>
          <h2>Everything included in your order.</h2>
          <div>{included.map((item) => <p key={item}><Check /> {item}</p>)}</div>
        </article>
        <article className="product-facts-card">
          <span className="section-index">PRODUCT FACTS</span>
          <dl>
            <div><dt><ShieldCheck /> License</dt><dd>{product.license ?? "Standard marketplace license"}</dd></div>
            <div><dt><FileArchive /> Formats</dt><dd>{formats.join(", ")}</dd></div>
            <div><dt><Layers3 /> Version</dt><dd>{product.version ?? "Current release"}</dd></div>
            <div><dt><RefreshCw /> Last updated</dt><dd>{product.updatedAt ?? "Maintained by seller"}</dd></div>
            <div><dt><Globe2 /> Delivery</dt><dd>{product.delivery}</dd></div>
            <div><dt><MessageCircle /> Seller response</dt><dd>Within {product.afterSalesServiceHours ?? 24} hours</dd></div>
            {Object.entries(product.facts ?? {}).map(([label, value]) => <div key={label}><dt><Check /> {label.replace(/([A-Z])/g, " $1")}</dt><dd>{String(value)}</dd></div>)}
            {product.sku ? <div><dt><Layers3 /> SKU</dt><dd>{product.sku}</dd></div> : null}
          </dl>
        </article>
      </section>

      {(product.warranty || product.refundPolicy) ? <section className="product-policy-strip"><div><ShieldCheck /><span><strong>Warranty</strong><small>{product.warranty ?? "Seller warranty terms apply."}</small></span></div><div><RefreshCw /><span><strong>Refund policy</strong><small>{product.refundPolicy ?? "Marketplace refund policy applies."}</small></span></div></section> : null}

      <section className="product-policy-strip">
        <div><ShieldCheck /><span><strong>Review before buying</strong><small>Confirm the file formats, license scope, and requirements above.</small></span></div>
        <div><Download /><span><strong>Protected delivery</strong><small>Downloads and seller submissions stay linked to your order.</small></span></div>
        <div><MessageCircle /><span><strong>Contextual support</strong><small>Open a support request directly from the relevant order.</small></span></div>
      </section>

      <section className="detail-section review-showcase">
        <div>
          <span className="section-index">VERIFIED REVIEWS</span>
          <h2>Buyers know what arrived.</h2>
          <p>
            Only customers with a paid order can publish a review. Sellers can
            respond, and abusive content enters moderation.
          </p>
        </div>
        <div className="review-cards">
          <article>
            <span>★★★★★</span>
            <p>
              “Clear files, thoughtful organization, and exactly the license I
              expected.”
            </p>
            <small>Verified buyer · 3 weeks ago</small>
          </article>
          <article>
            <span>★★★★★</span>
            <p>
              “The update appeared in my library automatically. That part is
              genuinely lovely.”
            </p>
            <small>Verified buyer · 1 month ago</small>
          </article>
        </div>
      </section>

      <section className="product-faq-section">
        <div><span className="section-index">BEFORE YOU BUY</span><h2>Common questions</h2><p>Important delivery and usage details, kept close to the purchase decision.</p></div>
        <div>
          <details open><summary>When will I receive this product?</summary><p>{product.delivery}. Your order page shows the exact delivery state and any seller message.</p></details>
          <details><summary>Can I use it for client or commercial work?</summary><p>{product.license ?? "The standard marketplace license applies"}. Review any seller-specific restrictions shown in the delivered license file.</p></details>
          <details><summary>What happens if something is missing?</summary><p>Use the order-linked support flow within the {product.afterSalesServiceHours ?? 24}-hour after-sales window so the seller and support team have the correct context.</p></details>
        </div>
      </section>

      {relatedProducts.length ? <section className="related-product-section"><div className="catalog-section-heading"><div><span className="section-index">CONTINUE EXPLORING</span><h2>Related products</h2><p>More products with a similar category or delivery format.</p></div><Link to={`/categories/${product.categorySlug}`}>View category <ArrowLink /></Link></div><div className="related-product-grid">{relatedProducts.map((item) => <MarketplaceProductCard key={item.id} product={item} onBuy={addRelatedToCart} layout="grid" />)}</div></section> : null}

      <section className="report-line">
        <Flag />
        <div>
          <strong>Something doesn’t look right?</strong>
          <span>
            Account trading, stolen work, credentials, hacking tools, spam, and
            fake-review services are prohibited.
          </span>
        </div>
        <Link to={user ? "/support" : "/sign-in"}>Report product</Link>
      </section>
      <MarketFooter />
    </main>
  );
}

function ArrowLink() {
  return <span aria-hidden="true">→</span>;
}
