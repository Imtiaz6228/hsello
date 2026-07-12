import { BadgeCheck, CalendarDays, MessageCircle, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useMarketplaceStore } from "../commerce/useMarketplace";
import { useLocale } from "../i18n/LocaleContext";

const stores: Record<string, { name: string; about: string; policy: string; rating: number; sales: string; joined: string; mark: string }> = {
  "northstar-studio": { name: "Northstar Studio", about: "Original brand systems and practical publishing tools for independent teams.", policy: "Commercial use is included for one business. Source files and future corrections are available to verified buyers.", rating: 4.9, sales: "2.4k", joined: "2024", mark: "NS" },
  "inbox-atelier": { name: "Inbox Atelier", about: "Thoughtful email design and opt-in lifecycle marketing resources.", policy: "Templates may be adapted for client work. Redistribution and use with unsolicited lists are prohibited.", rating: 4.8, sales: "1.3k", joined: "2025", mark: "IA" },
  "neural-desk": { name: "Neural Desk", about: "Human-centered AI workflows with privacy and review built into every system.", policy: "Educational materials are vendor-neutral. No third-party accounts, API keys, or credentials are included.", rating: 4.9, sales: "3.8k", joined: "2024", mark: "ND" },
  "frame-and-field": { name: "Frame & Field", about: "Sound and motion assets for documentary and editorial storytellers.", policy: "A commercial production license is included. Raw assets may not be resold or redistributed.", rating: 4.7, sales: "860", joined: "2025", mark: "FF" },
  "pixel-supply": { name: "Pixel Supply", about: "Original interface systems and art assets for independent game makers.", policy: "Use in unlimited shipped games; resale of source assets is prohibited.", rating: 5, sales: "1.7k", joined: "2024", mark: "PS" },
  "studio-practice": { name: "Studio Practice", about: "Direct, kind creative feedback for designers building stronger bodies of work.", policy: "Rescheduling is available with 24 hours’ notice. Deliverables are shared in the protected order workspace.", rating: 4.9, sales: "540", joined: "2025", mark: "SP" }
};

export function StorePage() {
  const { formatMoney } = useLocale();
  const { slug } = useParams(); const { add } = useCart(); const navigate = useNavigate();
  const live = useMarketplaceStore(slug);
  const store = live.store ?? (slug ? stores[slug] : undefined);
  if (live.loading && !store) return <main className="commerce-page"><MarketHeader /><p className="empty-state">Loading store…</p></main>;
  if (!store || !slug) return <Navigate to="/catalog" replace />;
  const products = live.products;
  return <main className="commerce-page"><Seo title={`${store.name} store`} description={store.about} canonicalPath={`/stores/${slug}`} /><MarketHeader />
    <section className="store-banner"><div className="store-monogram">{store.mark}</div><div><span className="verified-store"><BadgeCheck /> VERIFIED SELLER</span><h1>{store.name}</h1><p>{store.about}</p><div className="store-facts"><span><Star fill="currentColor" /> {store.rating} rating</span><span>{store.sales} sales</span><span>{products.length} products</span><span><CalendarDays /> Joined {store.joined}</span></div></div><Link to="/support"><MessageCircle /> Contact seller</Link></section>
    <section className="store-body"><div><span className="section-index">PRODUCTS</span><div className="store-products">{products.map((product) => <article key={product.id}><div>{product.icon}</div><span>{product.badge}</span><Link to={`/products/${product.slug}`}><h2>{product.title}</h2></Link><p>{product.description}</p><footer><strong>{formatMoney(product.priceCents)}</strong><button onClick={() => { add(product); navigate("/cart"); }}><ShoppingBag /> Add to cart</button></footer></article>)}</div></div><aside><ShieldCheck /><h2>Seller policy</h2><p>{store.policy}</p><small>All purchases remain covered by HSello buyer protection and the platform refund policy.</small></aside></section><MarketFooter />
  </main>;
}
