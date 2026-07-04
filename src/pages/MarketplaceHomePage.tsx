import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Gamepad2,
  Gift,
  Globe2,
  Headphones,
  KeyRound,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Category = {
  name: string;
  description: string;
  offers: string;
  icon: LucideIcon;
  tone: string;
};

const categories: Category[] = [
  { name: "Game currency", description: "Coins, gold and credits", offers: "12.4k offers", icon: WalletCards, tone: "violet" },
  { name: "Gift cards", description: "Global and regional cards", offers: "8.1k offers", icon: Gift, tone: "coral" },
  { name: "Game accounts", description: "Ready-to-play profiles", offers: "6.8k offers", icon: Gamepad2, tone: "blue" },
  { name: "Items & skins", description: "Rare drops and cosmetics", offers: "18.2k offers", icon: Sparkles, tone: "lime" },
  { name: "Boosting", description: "Ranks, raids and coaching", offers: "4.7k offers", icon: TrendingUp, tone: "amber" },
  { name: "Software", description: "Licenses and productivity", offers: "3.9k offers", icon: KeyRound, tone: "cyan" }
];

const products = [
  { category: "Game currency", title: "Aether Gold — EU & US delivery", seller: "Northstar Vault", price: "$12.40", rating: "4.98", orders: "2.4k", delivery: "5–15 min", badge: "Hot" },
  { category: "Gift cards", title: "Global gaming wallet — instant code", seller: "Pixel Supply", price: "$24.80", rating: "4.96", orders: "8.1k", delivery: "Instant", badge: "Bestseller" },
  { category: "Items & skins", title: "Crimson collection — rare skin pack", seller: "Orbit Market", price: "$18.20", rating: "4.93", orders: "940", delivery: "10 min", badge: "Limited" },
  { category: "Boosting", title: "Rank climb with live progress tracking", seller: "Level Labs", price: "$29.00", rating: "4.99", orders: "1.7k", delivery: "1–2 days", badge: "Top rated" },
  { category: "Software", title: "Creative suite — 12 month license", seller: "Cloud Keys", price: "$39.50", rating: "4.91", orders: "3.3k", delivery: "Instant", badge: "Verified" },
  { category: "Game accounts", title: "Competitive starter profile + extras", seller: "Nova Profiles", price: "$16.90", rating: "4.95", orders: "760", delivery: "Manual 1h", badge: "New" }
];

const stores = [
  { name: "Pixel Supply", specialty: "Gift cards & top-ups", rating: "4.99", sales: "18.4k", mark: "PS", tone: "coral" },
  { name: "Northstar Vault", specialty: "Game currency", rating: "4.98", sales: "12.1k", mark: "NV", tone: "violet" },
  { name: "Cloud Keys", specialty: "Software licenses", rating: "4.96", sales: "9.7k", mark: "CK", tone: "cyan" },
  { name: "Level Labs", specialty: "Boosting & coaching", rating: "4.99", sales: "7.2k", mark: "LL", tone: "lime" }
];

export function MarketplaceHomePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery = !normalizedQuery || [product.title, product.seller, product.category]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.querySelector("#offers")?.scrollIntoView({ behavior: "smooth" });
  }

  const accountPath = user
    ? (STAFF_ROLES.includes(user.role) ? "/admin" : "/dashboard")
    : "/sign-in";

  return (
    <main className="marketplace-shell">
      <div className="market-grain" aria-hidden="true" />

      <div className="announcement-bar">
        <span><ShieldCheck size={14} /> Buyer protection on every order</span>
        <span className="announcement-center">New seller fees: <strong>from 4%</strong></span>
        <span>24/7 dispute support <Headphones size={14} /></span>
      </div>

      <header className="market-header">
        <Link className="brand-lockup" to="/" aria-label="HSello home">
          <span className="brand-glyph">H</span>
          <span><strong>HSELLO</strong><small>DIGITAL EXCHANGE</small></span>
        </Link>
        <nav className="market-nav" aria-label="Main navigation">
          <a href="#categories">Categories</a>
          <a href="#offers">Trending</a>
          <a href="#stores">Top stores</a>
          <a href="#sell">Sell on HSello</a>
        </nav>
        <div className="header-actions">
          {user ? (
            <Link className="header-account" to={accountPath}>My account <ArrowRight size={16} /></Link>
          ) : (
            <>
              <Link className="header-signin" to="/sign-in">Sign in</Link>
              <Link className="header-join" to="/register">Join marketplace</Link>
            </>
          )}
        </div>
      </header>

      <section className="market-hero">
        <div className="hero-copy-block">
          <div className="hero-kicker"><span className="live-dot" /> 42,810 offers live now</div>
          <h1>THE DIGITAL<br /><em>MARKET,</em> REWIRED.</h1>
          <p>Game credits, gift cards, software and expert services from vetted sellers—with escrow protection built into every order.</p>

          <form className="hero-search" onSubmit={submitSearch}>
            <Search size={22} aria-hidden="true" />
            <input
              aria-label="Search the marketplace"
              placeholder="Search products, games or stores"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">Explore market <ArrowRight size={17} /></button>
          </form>

          <div className="popular-searches">
            <span>Popular:</span>
            {["Gift cards", "Game currency", "Software", "Boosting"].map((item) => (
              <button type="button" key={item} onClick={() => { setCategory(item); document.querySelector("#offers")?.scrollIntoView({ behavior: "smooth" }); }}>{item}</button>
            ))}
          </div>
        </div>

        <div className="hero-market-card">
          <div className="pulse-heading">
            <span>MARKET PULSE</span>
            <span className="pulse-live"><i /> LIVE</span>
          </div>
          <div className="featured-drop">
            <span className="drop-number">01</span>
            <div className="drop-art" aria-hidden="true"><Gamepad2 size={58} /></div>
            <div>
              <span className="mini-label">FEATURED DROP</span>
              <h2>Global game wallet</h2>
              <p>Instant code · 4.9 seller rating</p>
            </div>
            <strong>$24.80</strong>
          </div>
          <div className="market-ticker">
            <div><span>ORDERS / 24H</span><strong>8,429</strong><small>+12.4%</small></div>
            <div><span>ACTIVE SELLERS</span><strong>1,284</strong><small>verified</small></div>
          </div>
          <div className="recent-trades">
            <span>Recent protected trades</span>
            {["Game credits", "Rare item pack", "Software key"].map((trade, index) => (
              <div key={trade}><i className={`trade-icon trade-${index}`} /><span>{trade}</span><small>{index + 1}m ago</small><CheckCircle2 size={15} /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Marketplace guarantees">
        <div><ShieldCheck /><span><strong>Escrow protected</strong><small>Funds release when you approve</small></span></div>
        <div><BadgeCheck /><span><strong>Vetted sellers</strong><small>Identity and quality reviewed</small></span></div>
        <div><Zap /><span><strong>Fast delivery</strong><small>Most orders in under 15 min</small></span></div>
        <div><Headphones /><span><strong>Human support</strong><small>Real help, every day</small></span></div>
      </section>

      <section className="market-section categories-section" id="categories">
        <div className="market-section-heading">
          <div><span className="section-index">01 / DISCOVER</span><h2>Start with a category</h2></div>
          <p>A focused catalog that still gives power buyers the depth they expect.</p>
        </div>
        <div className="category-grid">
          {categories.map(({ name, description, offers, icon: Icon, tone }) => (
            <button
              className={`category-tile tone-${tone} ${category === name ? "selected" : ""}`}
              type="button"
              key={name}
              onClick={() => { setCategory(name); document.querySelector("#offers")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <span className="category-icon"><Icon size={25} /></span>
              <span className="category-copy"><strong>{name}</strong><small>{description}</small></span>
              <span className="category-count">{offers}</span>
              <ArrowRight className="category-arrow" size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="market-section offers-section" id="offers">
        <div className="market-section-heading offers-heading">
          <div><span className="section-index">02 / LIVE OFFERS</span><h2>Trending right now</h2></div>
          <button className="view-all-button" type="button" onClick={() => setCategory("All")}>View all <ArrowRight size={16} /></button>
        </div>
        <div className="filter-row">
          {["All", ...categories.map((item) => item.name)].map((item) => (
            <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>

        {visibleProducts.length ? (
          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product.title}>
                <div className={`product-visual product-visual-${index % 6}`}>
                  <span className="product-badge">{product.badge}</span>
                  <span className="visual-watermark">{String(index + 1).padStart(2, "0")}</span>
                  <PackageCheck size={48} />
                </div>
                <div className="product-content">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.title}</h3>
                  <div className="seller-line"><BadgeCheck size={15} /> {product.seller}</div>
                  <div className="product-meta">
                    <span><Star size={14} fill="currentColor" /> {product.rating} <small>({product.orders})</small></span>
                    <span><Clock3 size={14} /> {product.delivery}</span>
                  </div>
                  <div className="product-footer">
                    <span>From <strong>{product.price}</strong></span>
                    <Link to="/register" aria-label={`View ${product.title}`}><ArrowRight size={18} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-results"><Search size={28} /><strong>No matching offers</strong><span>Try a broader search or another category.</span></div>
        )}
      </section>

      <section className="market-section stores-section" id="stores">
        <div className="market-section-heading">
          <div><span className="section-index">03 / SELLERS</span><h2>Stores buyers return to</h2></div>
          <p>High-volume vendors with consistent delivery and dispute-free histories.</p>
        </div>
        <div className="store-grid">
          {stores.map((store, index) => (
            <article className="store-card" key={store.name}>
              <span className="store-rank">0{index + 1}</span>
              <span className={`store-mark tone-${store.tone}`}>{store.mark}</span>
              <div><h3>{store.name} <BadgeCheck size={16} /></h3><p>{store.specialty}</p></div>
              <div className="store-stats"><span><Star size={14} fill="currentColor" /> {store.rating}</span><span>{store.sales} sales</span></div>
              <Link to="/register">View store <ArrowRight size={15} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="how-intro"><span className="section-index">04 / HOW IT WORKS</span><h2>Three steps.<br />Zero guesswork.</h2><p>We hold payment securely while seller and buyer complete the order.</p></div>
        <div className="how-steps">
          <div><span>01</span><Search /><h3>Find the right offer</h3><p>Compare price, delivery time, seller score and recent order history.</p></div>
          <div><span>02</span><ShieldCheck /><h3>Pay into escrow</h3><p>Your funds stay protected until the order arrives as described.</p></div>
          <div><span>03</span><CheckCircle2 /><h3>Approve and move on</h3><p>Confirm delivery, release payment and leave a verified review.</p></div>
        </div>
      </section>

      <section className="seller-cta" id="sell">
        <div className="seller-orbit" aria-hidden="true"><Store size={68} /><span /><span /></div>
        <div><span className="section-index">FOR PROFESSIONAL SELLERS</span><h2>Turn inventory into a global storefront.</h2><p>Built-in analytics, protected payouts and a buyer base that is ready to transact.</p></div>
        <div className="seller-cta-actions"><Link to="/register">Open your store <ArrowRight size={17} /></Link><span><Users size={17} /> 1,284 sellers active</span></div>
      </section>

      <footer className="market-footer">
        <div className="footer-brand"><span className="brand-glyph">H</span><div><strong>HSELLO</strong><p>A safer exchange for digital products and services.</p></div></div>
        <div><strong>Marketplace</strong><a href="#categories">Categories</a><a href="#offers">Trending offers</a><a href="#stores">Top stores</a></div>
        <div><strong>Company</strong><a href="#sell">Sell with us</a><Link to="/register">Create account</Link><Link to="/sign-in">Sign in</Link></div>
        <div><strong>Trust</strong><span><Globe2 size={14} /> Global marketplace</span><span><ShieldCheck size={14} /> Escrow protected</span><span><Headphones size={14} /> 24/7 support</span></div>
        <p className="footer-bottom">© 2026 HSello Digital Exchange. Independent marketplace. All product names belong to their respective owners.</p>
      </footer>
    </main>
  );
}
