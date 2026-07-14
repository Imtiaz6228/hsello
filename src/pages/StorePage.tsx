import { BadgeCheck, CalendarDays, MessageCircle, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useMarketplaceStore } from "../commerce/useMarketplace";
import { useLocale } from "../i18n/LocaleContext";

export function StorePage() {
  const { formatMoney } = useLocale();
  const { slug } = useParams(); const { add } = useCart(); const navigate = useNavigate();
  const live = useMarketplaceStore(slug);
  const store = live.store;
  if (live.loading) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading store…</p></main>;
  if (live.error) return <main className="commerce-page"><MarketHeader /><div className="status-panel error" role="alert"><strong>Store unavailable</strong><span>{live.error}</span><Link to="/catalog">Return to catalog</Link></div><MarketFooter /></main>;
  if (!store || !slug) return <Navigate to="/catalog" replace />;
  const products = live.products;
  return <main className="commerce-page"><Seo title={`${store.name} store`} description={store.about} canonicalPath={`/stores/${slug}`} /><MarketHeader />
    <section className={`store-banner ${store.bannerUrl ? "has-store-banner" : ""}`} style={store.bannerUrl ? { backgroundImage: `linear-gradient(100deg, rgba(8,12,26,.93), rgba(49,35,112,.74)), url(${store.bannerUrl})` } : undefined}><div className="store-monogram">{store.logoUrl ? <img src={store.logoUrl} alt={`${store.name} logo`} loading="lazy" width="128" height="128" /> : store.mark}</div><div><span className="verified-store"><BadgeCheck /> VERIFIED SELLER</span><h1>{store.name}</h1><p>{store.about}</p><div className="store-facts"><span><Star fill="currentColor" /> {store.rating} rating</span><span>{store.sales} sales</span><span>{products.length} products shown</span><span><CalendarDays /> Joined {store.joined}</span></div></div><Link to="/support"><MessageCircle /> Contact seller</Link></section>
    <section className="store-body"><div><span className="section-index">PRODUCTS</span>{products.length ? <div className="store-products">{products.map((product) => <article key={product.id}><div className="store-product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" width="640" height="480" /> : product.icon}</div><span>{product.badge}</span><Link to={`/products/${product.slug}`}><h2>{product.title}</h2></Link><p>{product.description}</p><footer><strong>{formatMoney(product.priceCents)}</strong><button type="button" onClick={() => { add(product); navigate("/cart"); }}><ShoppingBag /> Add to cart</button></footer></article>)}</div> : <div className="no-results"><ShoppingBag /><strong>No published products</strong><span>This seller has no active listings right now.</span></div>}</div><aside><ShieldCheck /><h2>Seller policy</h2><p>{store.policy}</p><small>All purchases remain covered by HSello buyer protection and the platform refund policy.</small></aside></section><MarketFooter />
  </main>;
}
