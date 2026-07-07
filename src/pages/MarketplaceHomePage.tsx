import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Gamepad2,
  Gift,
  Globe2,
  Headphones,
  KeyRound,
  Mail,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  WalletCards,
  Wifi,
  Zap,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Category = {
  name: string;
  description: string;
  subcategories: string[];
  icon: LucideIcon;
  tone: string;
};

const categories: Category[] = [
  { name: "Social media accounts", description: "Profiles for creators, communities and brands", subcategories: ["Instagram", "TikTok", "Facebook", "X / Twitter", "LinkedIn", "Snapchat"], icon: AtSign, tone: "violet" },
  { name: "Email accounts", description: "Personal, aged and workspace-ready mail", subcategories: ["Gmail", "Outlook", "Yahoo Mail", "Proton Mail", "iCloud Mail", "Business email"], icon: Mail, tone: "coral" },
  { name: "AI tools & access", description: "Premium AI assistants and creative tools", subcategories: ["ChatGPT", "Claude", "Midjourney", "Gemini", "Perplexity", "Copilot"], icon: Bot, tone: "blue" },
  { name: "Streaming subscriptions", description: "Video, music and premium entertainment", subcategories: ["Netflix", "Spotify", "Disney+", "YouTube Premium", "Prime Video", "Hulu"], icon: Clapperboard, tone: "lime" },
  { name: "Messaging accounts", description: "Established accounts across major networks", subcategories: ["Telegram", "Discord", "WhatsApp", "Signal", "Viber", "LINE"], icon: MessageCircle, tone: "amber" },
  { name: "Gaming accounts", description: "Full-access profiles for leading platforms", subcategories: ["Steam", "PlayStation", "Xbox", "Epic Games", "Riot / Valorant", "Roblox"], icon: Gamepad2, tone: "cyan" },
  { name: "Game currency & items", description: "Coins, gold, skins, items and collectibles", subcategories: ["EA FC Coins", "WoW Gold", "Robux", "Fortnite Items", "Diablo Gold", "CS2 Skins"], icon: WalletCards, tone: "violet" },
  { name: "Gift cards & top-ups", description: "Regional codes, wallet credit and direct top-up", subcategories: ["Steam", "PlayStation", "Xbox", "Apple", "Google Play", "Nintendo"], icon: Gift, tone: "coral" },
  { name: "Software & licenses", description: "Operating systems, creative and security tools", subcategories: ["Windows", "Microsoft 365", "Adobe", "Canva", "Antivirus", "Developer tools"], icon: KeyRound, tone: "blue" },
  { name: "Boosting & coaching", description: "Rank, raid, quest and coaching services", subcategories: ["Valorant", "League of Legends", "Fortnite", "WoW", "EA FC", "Call of Duty"], icon: TrendingUp, tone: "lime" },
  { name: "VPN & proxies", description: "Privacy plans and regional connectivity", subcategories: ["Residential proxy", "Mobile proxy", "Datacenter proxy", "VPN access", "Static ISP", "Rotating IP"], icon: Wifi, tone: "amber" },
  { name: "Mobile recharge", description: "Instant prepaid airtime and data bundles", subcategories: ["United States", "United Kingdom", "Europe", "Middle East", "Asia", "Global eSIM"], icon: Smartphone, tone: "cyan" }
];

const products = [
  { category: "Social media accounts", title: "Instagram creator profile — established account", seller: "Creator District", price: "$18.00", rating: "4.98", orders: "2.4k", delivery: "10–30 min", badge: "Popular", tags: ["Instagram", "social media", "creator"] },
  { category: "Email accounts", title: "Gmail account — recovery details included", seller: "Inbox Market", price: "$4.80", rating: "4.96", orders: "8.1k", delivery: "Instant", badge: "Bestseller", tags: ["Gmail", "email", "Google"] },
  { category: "AI tools & access", title: "ChatGPT Plus — one month premium access", seller: "Neural Desk", price: "$14.90", rating: "4.97", orders: "3.8k", delivery: "Instant", badge: "Trending", tags: ["ChatGPT", "OpenAI", "AI", "Claude", "Midjourney"] },
  { category: "Streaming subscriptions", title: "Netflix Premium — private profile access", seller: "Stream Stack", price: "$7.50", rating: "4.95", orders: "6.7k", delivery: "5–15 min", badge: "Hot", tags: ["Netflix", "streaming", "Spotify", "Disney Plus"] },
  { category: "Messaging accounts", title: "Telegram account — selectable region", seller: "Connect Hub", price: "$6.20", rating: "4.94", orders: "1.9k", delivery: "10 min", badge: "Verified", tags: ["Telegram", "Discord", "WhatsApp", "messenger"] },
  { category: "Gaming accounts", title: "Steam account — full-access starter library", seller: "Nova Profiles", price: "$16.90", rating: "4.95", orders: "760", delivery: "Manual 1h", badge: "New", tags: ["Steam", "PlayStation", "Xbox", "Epic Games"] },
  { category: "Game currency & items", title: "EA FC coins — fast player-auction delivery", seller: "Northstar Vault", price: "$12.40", rating: "4.98", orders: "2.4k", delivery: "5–15 min", badge: "Fast", tags: ["EA FC", "FIFA", "coins", "items", "skins"] },
  { category: "Gift cards & top-ups", title: "PlayStation Store gift card — instant code", seller: "Pixel Supply", price: "$24.80", rating: "4.96", orders: "8.1k", delivery: "Instant", badge: "Bestseller", tags: ["PSN", "PlayStation", "gift card", "top up"] },
  { category: "Software & licenses", title: "Microsoft 365 — 12 month activation", seller: "Cloud Keys", price: "$39.50", rating: "4.91", orders: "3.3k", delivery: "Instant", badge: "Verified", tags: ["Microsoft", "Office", "Windows", "software"] },
  { category: "Boosting & coaching", title: "Valorant rank boost — live progress tracking", seller: "Level Labs", price: "$29.00", rating: "4.99", orders: "1.7k", delivery: "1–2 days", badge: "Top rated", tags: ["Valorant", "rank", "boosting", "coaching"] },
  { category: "VPN & proxies", title: "Residential proxy plan — 10 GB traffic", seller: "Route Works", price: "$21.00", rating: "4.92", orders: "1.1k", delivery: "Instant", badge: "Flexible", tags: ["proxy", "VPN", "residential", "mobile proxy"] },
  { category: "Mobile recharge", title: "Global mobile airtime — instant recharge", seller: "TopUp Relay", price: "$10.00", rating: "4.93", orders: "4.6k", delivery: "Instant", badge: "Global", tags: ["mobile", "recharge", "airtime", "eSIM"] }
];

const stores = [
  { name: "Creator District", specialty: "Social, email & messaging accounts", rating: "4.99", sales: "18.4k", mark: "CD", tone: "coral" },
  { name: "Neural Desk", specialty: "AI tools & premium productivity", rating: "4.98", sales: "12.1k", mark: "ND", tone: "violet" },
  { name: "Stream Stack", specialty: "Streaming & entertainment access", rating: "4.96", sales: "9.7k", mark: "SS", tone: "cyan" },
  { name: "Pixel Supply", specialty: "Games, gift cards & top-ups", rating: "4.99", sales: "7.2k", mark: "PS", tone: "lime" }
];

const catalogGroups = [
  { label: "Accounts", items: ["Social media", "Email", "Messaging", "Gaming accounts"] },
  { label: "Entertainment", items: ["Streaming", "Game currency", "Items & skins", "Gift cards"] },
  { label: "Productivity", items: ["AI tools", "Software", "VPN & proxies", "Business tools"] },
  { label: "Services", items: ["Boosting", "Coaching", "Top-ups", "Mobile recharge"] }
];

export function MarketplaceHomePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery = !normalizedQuery || [product.title, product.seller, product.category, ...product.tags]
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
          <div className="hero-kicker"><span className="live-dot" /> 12 categories · 72 specialist markets</div>
          <h1>THE DIGITAL<br /><em>MARKET,</em> REWIRED.</h1>
          <p>Social and email accounts, AI tools, streaming access, gaming goods, software and specialist services—organized into one protected exchange.</p>

          <form className="hero-search" onSubmit={submitSearch}>
            <Search size={22} aria-hidden="true" />
            <input
              aria-label="Search the marketplace"
              placeholder="Search Instagram, Gmail, ChatGPT, Netflix..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">Explore market <ArrowRight size={17} /></button>
          </form>

          <div className="popular-searches">
            <span>Popular:</span>
            {["Social media accounts", "Email accounts", "AI tools & access", "Streaming subscriptions"].map((item) => (
              <button type="button" key={item} onClick={() => { setCategory(item); document.querySelector("#offers")?.scrollIntoView({ behavior: "smooth" }); }}>{item}</button>
            ))}
          </div>
        </div>

        <div className="hero-market-card">
          <div className="pulse-heading">
            <span>CATALOG PULSE</span>
            <span className="pulse-live"><i /> EXPANDED</span>
          </div>
          <div className="featured-drop">
            <span className="drop-number">01</span>
            <div className="drop-art" aria-hidden="true"><Bot size={58} /></div>
            <div>
              <span className="mini-label">FASTEST-GROWING</span>
              <h2>AI & subscriptions</h2>
              <p>ChatGPT · Claude · Midjourney</p>
            </div>
            <strong>06</strong>
          </div>
          <div className="market-ticker">
            <div><span>MAIN CATEGORIES</span><strong>12</strong><small>complete catalog</small></div>
            <div><span>SUBCATEGORIES</span><strong>72</strong><small>specialist markets</small></div>
          </div>
          <div className="recent-trades">
            <span>New catalog routes</span>
            {["Social & email accounts", "AI & streaming access", "VPN & mobile recharge"].map((trade, index) => (
              <div key={trade}><i className={`trade-icon trade-${index}`} /><span>{trade}</span><small>ready</small><CheckCircle2 size={15} /></div>
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
          <div><span className="section-index">01 / COMPLETE DIRECTORY</span><h2>Every digital market</h2></div>
          <p>Twelve real marketplace categories with the submarkets buyers actually search for.</p>
        </div>
        <div className="category-grid">
          {categories.map(({ name, description, subcategories, icon: Icon, tone }) => (
            <button
              className={`category-tile tone-${tone} ${category === name ? "selected" : ""}`}
              type="button"
              key={name}
              onClick={() => { setCategory(name); document.querySelector("#offers")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <span className="category-icon"><Icon size={25} /></span>
              <span className="category-copy"><strong>{name}</strong><small>{description}</small></span>
              <span className="category-subcategories">
                {subcategories.slice(0, 4).map((item) => <i key={item}>{item}</i>)}
              </span>
              <span className="category-count">{subcategories.length} subcategories</span>
              <ArrowRight className="category-arrow" size={18} />
            </button>
          ))}
        </div>
        <div className="catalog-directory" aria-label="Catalog groups">
          <div className="directory-intro">
            <Sparkles size={23} />
            <span><strong>72 specialist markets</strong><small>From Instagram and Gmail to ChatGPT, Netflix, Steam, software, proxies and top-ups.</small></span>
          </div>
          {catalogGroups.map((group) => (
            <div className="directory-group" key={group.label}>
              <strong>{group.label}</strong>
              {group.items.map((item) => <span key={item}>{item}</span>)}
            </div>
          ))}
        </div>
      </section>

      <section className="market-section offers-section" id="offers">
        <div className="market-section-heading offers-heading">
          <div><span className="section-index">02 / MARKETPLACE OFFERS</span><h2>Across the full catalog</h2></div>
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
                    <Link to="/catalog" aria-label={`View ${product.title}`}><ArrowRight size={18} /></Link>
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
              <Link to="/catalog">View store <ArrowRight size={15} /></Link>
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
        <div className="seller-cta-actions"><Link to="/seller/apply">Open your store <ArrowRight size={17} /></Link><span><Users size={17} /> 1,284 sellers active</span></div>
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
