import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, Bot, Check, ChevronDown, Clock3, Cloud,
  Gamepad2, Gift, Globe2, Headphones, KeyRound, LogOut, Mail, Menu, MessageCircle,
  Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Star, Store, UserPlus,
  TrendingUp, Users, WalletCards, Wifi, X, Zap, type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useMarketplaceCategories, useMarketplaceProducts } from "../commerce/useMarketplace";
import { useCart } from "../commerce/CartContext";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

type Category = { name: string; short: string; description: string; subcategories: string[]; subDetails?: Record<string, Array<{ name: string; slug: string }>>; icon: LucideIcon; accent: string };
type Product = { slug?: string; imageUrl?: string | null; category: string; title: string; seller: string; price: number; oldPrice?: number; rating: string; reviews: string; delivery: string; badge?: string; icon: LucideIcon; accent: string; tags: string[] };

const fallbackCategories: Category[] = [
  { name: "Social media", short: "Social", description: "Creator resources and growth tools", subcategories: ["Instagram", "TikTok", "Facebook", "X / Twitter", "LinkedIn", "Snapchat"], icon: Users, accent: "purple" },
  { name: "Email products", short: "Email", description: "Mail tools and business resources", subcategories: ["Gmail", "Outlook", "Yahoo", "Proton Mail", "iCloud", "Business mail"], icon: Mail, accent: "orange" },
  { name: "AI & productivity", short: "AI tools", description: "Premium tools for modern work", subcategories: ["ChatGPT", "Claude", "Midjourney", "Gemini", "Perplexity", "Copilot"], icon: Bot, accent: "blue" },
  { name: "Streaming", short: "Streaming", description: "Entertainment and music access", subcategories: ["Netflix", "Spotify", "Disney+", "YouTube", "Prime Video", "Hulu"], icon: Cloud, accent: "pink" },
  { name: "Messaging", short: "Messaging", description: "Communication tools and services", subcategories: ["Telegram", "Discord", "WhatsApp", "Signal", "Viber", "LINE"], icon: MessageCircle, accent: "green" },
  { name: "Gaming", short: "Gaming", description: "Accounts, items and game services", subcategories: ["Steam", "PlayStation", "Xbox", "Epic Games", "Valorant", "Roblox"], icon: Gamepad2, accent: "indigo" },
  { name: "Game currency", short: "Currency", description: "Coins, skins and collectibles", subcategories: ["EA FC Coins", "WoW Gold", "Robux", "Fortnite", "Diablo", "CS2 Skins"], icon: WalletCards, accent: "yellow" },
  { name: "Gift cards", short: "Gift cards", description: "Global codes and wallet top-ups", subcategories: ["Steam", "PlayStation", "Xbox", "Apple", "Google Play", "Nintendo"], icon: Gift, accent: "red" },
  { name: "Software", short: "Software", description: "Licenses and professional tools", subcategories: ["Windows", "Microsoft 365", "Adobe", "Canva", "Antivirus", "Developer tools"], icon: KeyRound, accent: "cyan" },
  { name: "Boosting", short: "Boosting", description: "Coaching and progress services", subcategories: ["Valorant", "League", "Fortnite", "WoW", "EA FC", "Call of Duty"], icon: TrendingUp, accent: "lime" },
  { name: "VPN & proxies", short: "VPN", description: "Private, reliable connectivity", subcategories: ["Residential", "Mobile", "Datacenter", "VPN", "Static ISP", "Rotating IP"], icon: Wifi, accent: "teal" },
  { name: "Mobile top-up", short: "Mobile", description: "Airtime, data and global eSIM", subcategories: ["United States", "United Kingdom", "Europe", "Middle East", "Asia", "Global eSIM"], icon: Smartphone, accent: "blue" }
];

const products: Product[] = [
  { category: "AI & productivity", title: "ChatGPT Plus — 1 month premium access", seller: "Neural Desk", price: 14.9, oldPrice: 20, rating: "4.98", reviews: "3.8k", delivery: "Instant", badge: "-26%", icon: Bot, accent: "purple", tags: ["chatgpt", "ai", "openai", "productivity"] },
  { category: "Software", title: "Microsoft 365 — 12 month activation", seller: "Cloud Keys", price: 39.5, oldPrice: 59, rating: "4.95", reviews: "2.1k", delivery: "Instant", badge: "Bestseller", icon: KeyRound, accent: "blue", tags: ["microsoft", "office", "windows", "software"] },
  { category: "Streaming", title: "Spotify Premium — personal upgrade", seller: "Stream District", price: 7.5, oldPrice: 11, rating: "4.96", reviews: "6.7k", delivery: "5–15 min", badge: "Hot", icon: Cloud, accent: "green", tags: ["spotify", "music", "streaming"] },
  { category: "Gift cards", title: "PlayStation Store — instant digital code", seller: "Pixel Supply", price: 24.8, rating: "4.99", reviews: "8.1k", delivery: "Instant", badge: "Top rated", icon: Gift, accent: "indigo", tags: ["playstation", "psn", "gift card", "gaming"] },
  { category: "VPN & proxies", title: "Residential proxy plan — 10 GB traffic", seller: "Route Works", price: 21, oldPrice: 28, rating: "4.92", reviews: "1.1k", delivery: "Instant", icon: Wifi, accent: "cyan", tags: ["proxy", "vpn", "residential"] },
  { category: "Gaming", title: "Steam starter bundle — curated game library", seller: "Nova Profiles", price: 16.9, rating: "4.95", reviews: "760", delivery: "Under 1h", badge: "New", icon: Gamepad2, accent: "orange", tags: ["steam", "gaming", "pc"] },
  { category: "Social media", title: "Creator content kit — 250 post templates", seller: "Creator District", price: 18, oldPrice: 26, rating: "4.97", reviews: "2.4k", delivery: "Instant", badge: "Popular", icon: Users, accent: "pink", tags: ["instagram", "social", "templates", "creator"] },
  { category: "Mobile top-up", title: "Global eSIM — 5 GB travel data plan", seller: "TopUp Relay", price: 10, rating: "4.93", reviews: "4.6k", delivery: "Instant", icon: Smartphone, accent: "teal", tags: ["mobile", "esim", "travel", "data"] }
];

const sellers = [
  { name: "Neural Desk", mark: "ND", focus: "AI & productivity", score: "4.99", sales: "18.4k", accent: "purple" },
  { name: "Pixel Supply", mark: "PS", focus: "Games & gift cards", score: "4.99", sales: "12.7k", accent: "indigo" },
  { name: "Cloud Keys", mark: "CK", focus: "Software licenses", score: "4.97", sales: "9.3k", accent: "blue" },
  { name: "Creator District", mark: "CD", focus: "Social resources", score: "4.96", sales: "8.8k", accent: "orange" }
];

const blogPosts = [
  { tag: "BUYER GUIDE", title: "How to buy digital products safely in 2026", excerpt: "The simple checks that protect your payment and help you choose reliable sellers.", date: "July 8", accent: "purple" },
  { tag: "MARKET INTEL", title: "The 7 digital tools creators are buying now", excerpt: "A practical look at the products saving teams the most time this month.", date: "July 5", accent: "orange" },
  { tag: "SELLER PLAYBOOK", title: "Build a storefront buyers immediately trust", excerpt: "Better listings, clearer delivery promises and a support workflow that converts.", date: "June 29", accent: "blue" }
];

const platformSlugs: Record<string, string> = {
  Facebook: "facebook", Instagram: "instagram", TikTok: "tiktok", "X / Twitter": "twitter-x", LinkedIn: "linkedin", Snapchat: "snapchat",
  Gmail: "gmail", Outlook: "outlook", Yahoo: "yahoo-mail", "Proton Mail": "proton-mail", Steam: "pc-games-steam", PlayStation: "playstation",
  Xbox: "xbox", "Epic Games": "epic-games", Valorant: "valorant", Roblox: "roblox", Netflix: "netflix", Spotify: "spotify",
  "Disney+": "disney-plus", YouTube: "youtube-premium", "Prime Video": "prime-video", ChatGPT: "chatgpt", Claude: "claude",
  Midjourney: "midjourney", Gemini: "gemini", Canva: "canva", "Microsoft 365": "microsoft-365", Windows: "microsoft-365"
};

function detailOptions(platform: string, category: string) {
  if (platform === "Facebook") return ["New Facebook", "Old Facebook", "Facebook pages", "With friends", "Business manager"];
  if (["Instagram", "TikTok", "X / Twitter", "LinkedIn", "Snapchat"].includes(platform)) return [`New ${platform}`, `Old ${platform}`, "With followers", "With posts", "Business ready"];
  if (category === "Gaming" || category === "Game currency") return [`New ${platform}`, `Old ${platform}`, "Full access", "Currency & items", "Ranked profiles"];
  if (category === "Email products" || category === "Messaging") return [`New ${platform}`, `Old ${platform}`, "Phone verified", "Recovery included", "Bulk packs"];
  if (category === "Streaming" || category === "AI & productivity" || category === "Software") return ["1 month", "3 months", "6 months", "12 months", "Family / team"];
  return ["New listings", "Old listings", "Premium", "Bulk packs", "Instant delivery"];
}

function productVisual(category: string) {
  const match = fallbackCategories.find((item) => item.name.toLowerCase() === category.toLowerCase() || item.subcategories.some((sub) => sub.toLowerCase() === category.toLowerCase()));
  return { icon: match?.icon ?? ShoppingBag, accent: match?.accent ?? "purple" };
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  const { formatMoney } = useLocale();
  const [imageFailed, setImageFailed] = useState(false);
  const productPath = product.slug ? `/products/${product.slug}` : "/catalog";
  return <article className="lux-product-card">
    <Link to={productPath} className={`lux-product-art accent-${product.accent} ${product.imageUrl && !imageFailed ? "has-image" : ""}`} aria-label={`View ${product.title}`}>
      {product.badge && <span className="lux-badge">{product.badge}</span>}
      {product.imageUrl && !imageFailed ? <img src={product.imageUrl} alt={product.title} onError={() => setImageFailed(true)} /> : <><span className="art-ring" /><Icon size={56} strokeWidth={1.45} /><span className="art-name">{product.category}</span></>}
    </Link>
    <div className="lux-product-body">
      <span className="lux-product-category">{product.category}</span>
      <Link to={productPath}><h3>{product.title}</h3></Link>
      <div className="lux-seller"><BadgeCheck size={14} /> {product.seller}</div>
      <div className="lux-rating"><Star size={14} fill="currentColor" /> <strong>{product.rating}</strong><span>({product.reviews})</span><i /><Clock3 size={13} /><span>{product.delivery}</span></div>
      <div className="lux-price"><div><small>From</small><strong>{formatMoney(Math.round(product.price * 100))}</strong>{product.oldPrice && <del>{formatMoney(Math.round(product.oldPrice * 100))}</del>}</div><Link to={productPath} aria-label="Open product"><ArrowRight size={18} /></Link></div>
    </div>
  </article>;
}

export function MarketplaceHomePage() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t, formatMoney } = useLocale();
  const liveCatalogProducts = useMarketplaceProducts();
  const marketplaceCategories = useMarketplaceCategories();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState("Social media");
  const accountPath = user ? (STAFF_ROLES.includes(user.role) ? "/admin" : user.role === "SELLER" ? "/seller" : "/dashboard") : "/sign-in";
  const categories = useMemo<Category[]>(() => {
    const parents = marketplaceCategories.filter((item) => !item.parentId);
    if (!parents.length) return fallbackCategories;
    const icons: LucideIcon[] = [Users, Mail, Bot, Cloud, MessageCircle, Gamepad2, WalletCards, Gift, KeyRound, TrendingUp, Wifi, Smartphone];
    const accents = ["purple", "orange", "blue", "pink", "green", "indigo", "yellow", "red", "cyan", "lime", "teal", "blue"];
    return parents.map((parent, index) => {
      const children = marketplaceCategories.filter((item) => item.parentId === parent.id);
      return {
        name: parent.name,
        short: parent.name.split(/\s+/).slice(0, 2).join(" "),
        description: parent.description,
        subcategories: children.map((item) => item.name),
        subDetails: Object.fromEntries(children.map((child) => [child.name, marketplaceCategories.filter((item) => item.parentId === child.id).map((item) => ({ name: item.name, slug: item.slug }))])),
        icon: icons[index % icons.length],
        accent: accents[index % accents.length]
      };
    });
  }, [marketplaceCategories]);
  const displayProducts = useMemo<Product[]>(() => liveCatalogProducts.length ? liveCatalogProducts.map((product) => {
    const match = categories.find((item) => item.name.toLowerCase() === product.category.toLowerCase() || item.subcategories.some((sub) => sub.toLowerCase() === product.category.toLowerCase()));
    const visual = { icon: match?.icon ?? ShoppingBag, accent: match?.accent ?? "purple" };
    return { slug: product.slug, imageUrl: product.imageUrl, category: product.category, title: product.title, seller: product.seller, price: product.priceCents / 100, rating: product.rating ? product.rating.toFixed(2) : "New", reviews: String(product.reviews), delivery: product.delivery, badge: product.badge, icon: visual.icon, accent: visual.accent, tags: [product.title, product.category, product.seller] };
  }) : products, [categories, liveCatalogProducts]);
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return displayProducts.filter(p => (activeCategory === "All" || p.category === activeCategory || categories.find(c => c.name === activeCategory)?.subcategories.includes(p.category)) && (!q || [p.title, p.seller, p.category, ...p.tags].some(v => v.toLowerCase().includes(q))));
  }, [activeCategory, displayProducts, query]);
  function submitSearch(e: FormEvent) { e.preventDefault(); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }
  function pickCategory(name: string) { setActiveCategory(name); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }

  return <main className="lux-home">
    <div className="lux-topbar"><span><Sparkles size={14} /> Summer marketplace event: up to 40% off selected products</span><Link to="/catalog">Shop the sale <ArrowRight size={14} /></Link></div>
    <header className="lux-header">
      <Link className="lux-logo" to="/" aria-label="HSello home"><span>H</span><div><strong>HSELLO</strong><small>DIGITAL MARKET</small></div></Link>
      <nav className={mobileMenu ? "open" : ""} aria-label="Main navigation">
        <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label={t("close")}><X /></button>
        <div className="mobile-locale-row"><LocaleSwitcher /></div>
        <a className="desktop-categories-link" href="#categories">{t("categories")} <ChevronDown size={14} /></a>
        <button className={`mobile-catalog-trigger ${mobileCatalogOpen ? "active" : ""}`} type="button" onClick={() => setMobileCatalogOpen((open) => !open)}>{t("categories")} <ChevronDown size={16} /></button>
        {mobileCatalogOpen ? <div className="mobile-catalog-panel">
          <div className="mobile-main-categories">{categories.map((category) => { const Icon = category.icon; return <button type="button" key={category.name} className={mobileCategory === category.name ? `active accent-${category.accent}` : `accent-${category.accent}`} onClick={() => setMobileCategory(category.name)}><span><Icon /></span>{category.name}<ChevronDown /></button>; })}</div>
          <div className="mobile-subcategory-list"><header><strong>{mobileCategory}</strong><Link to="/catalog" onClick={() => setMobileMenu(false)}>View all</Link></header>{categories.find((item) => item.name === mobileCategory)?.subcategories.map((platform) => <details key={platform}><summary><span>{platform.slice(0,2).toUpperCase()}</span><strong>{platform}</strong><ChevronDown /></summary><div>{(() => {
              const liveDetails = categories.find((item) => item.name === mobileCategory)?.subDetails?.[platform] ?? [];
              const options = liveDetails.length ? liveDetails : detailOptions(platform, mobileCategory).map((name) => ({ name, slug: platformSlugs[platform] ?? platform.toLowerCase().replace(/[^a-z0-9]+/g, "-") }));
              return options.map((detail) => <Link key={`${platform}-${detail.name}`} to={`/catalog?category=${encodeURIComponent(detail.slug)}${liveDetails.length ? "" : `&q=${encodeURIComponent(detail.name)}`}`} onClick={() => setMobileMenu(false)}>{detail.name}<ArrowRight /></Link>);
            })()}</div></details>)}</div>
        </div> : null}
        <a href="#products" onClick={() => setMobileMenu(false)}>{t("products")}</a>
        <a href="#sellers" onClick={() => setMobileMenu(false)}>{t("topSellers")}</a>
        <a href="#journal" onClick={() => setMobileMenu(false)}>{t("blog")}</a>
        <Link to="/seller/apply" onClick={() => setMobileMenu(false)}>{t("sellOn")}</Link>
        <div className="mobile-auth-links">{!user ? <><Link to="/sign-in" onClick={() => setMobileMenu(false)}>{t("signIn")}</Link><Link className="primary" to="/register" onClick={() => setMobileMenu(false)}><UserPlus size={16} /> {t("register")}</Link></> : <><Link to={accountPath} onClick={() => setMobileMenu(false)}>{t("dashboard")}</Link><Link className="danger" to="/sign-out" onClick={() => setMobileMenu(false)}><LogOut size={16} /> {t("signOut")}</Link></>}</div>
      </nav>
      <div className="lux-header-actions"><button className="menu-button" onClick={() => setMobileMenu(true)} aria-label={t("menu")}><Menu /></button><LocaleSwitcher compact /><Link className="lux-signin" to={accountPath}>{user ? t("account") : t("signIn")}</Link><Link className="lux-cart" to="/cart"><ShoppingBag size={18} /><span>{count}</span></Link></div>
    </header>

    <section className="lux-hero">
      <div className="lux-hero-copy">
        <span className="lux-eyebrow"><i /> {t("homeEyebrow")}</span>
        <h1>{t("homeTitleA")}<br /><em>{t("homeTitleB")}</em></h1>
        <p>{t("homeIntro")}</p>
        <form className="lux-search" onSubmit={submitSearch}><Search size={21} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("homeSearch")} aria-label="Search products"/><button>{t("searchMarketplace")}</button></form>
        <div className="lux-popular"><span>Trending:</span>{["ChatGPT", "Microsoft 365", "Spotify", "Gift cards"].map(t => <button key={t} onClick={() => { setQuery(t); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }}>{t}</button>)}</div>
        <div className="lux-proof"><div><strong>30K+</strong><span>Verified products</span></div><div><strong>4.9/5</strong><span>Buyer satisfaction</span></div><div><strong>24/7</strong><span>Human support</span></div></div>
      </div>
      <div className="lux-hero-stage" aria-label="Featured marketplace products">
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <article className="hero-feature-card"><span className="hero-card-label">FEATURED DROP</span><div className="hero-feature-art"><Bot size={74} /><span>AI</span></div><h2>Work smarter.<br />Create faster.</h2><p>Premium AI tools from verified sellers.</p><Link to="/catalog">Explore AI tools <ArrowRight size={16} /></Link></article>
        <div className="floating-review"><span><Star size={15} fill="currentColor" /> 4.98</span><strong>Trusted by 42,000+ buyers</strong><small>Protected orders. Proven sellers.</small></div>
        <div className="floating-order"><Check size={16} /><span><strong>Order delivered</strong><small>in 2 minutes</small></span></div>
      </div>
    </section>

    <section className="lux-trust"><div><ShieldCheck /><span><strong>Buyer protection</strong><small>Every transaction is covered</small></span></div><div><BadgeCheck /><span><strong>Verified sellers</strong><small>Reviewed before they can sell</small></span></div><div><Zap /><span><strong>Fast delivery</strong><small>Most products arrive instantly</small></span></div><div><Headphones /><span><strong>Real support</strong><small>Help whenever you need it</small></span></div></section>

    <section className="lux-section" id="categories">
      <div className="lux-section-head"><div><span>EXPLORE THE MARKETPLACE</span><h2>{t("shopByCategory")}</h2></div><Link to="/catalog">Browse all categories <ArrowRight size={16} /></Link></div>
      <div className="lux-category-grid">{categories.map(c => { const Icon = c.icon; return <button key={c.name} onClick={() => pickCategory(c.name)} className={`lux-category-card accent-${c.accent}`}><span className="category-symbol"><Icon /></span><span className="category-text"><strong>{c.name}</strong><small>{c.description}</small></span><span className="category-tags">{c.subcategories.slice(0,3).map(s => <i key={s}>{s}</i>)}</span><span className="category-more">{c.subcategories.length > 3 ? `+${c.subcategories.length - 3} more` : "Explore"} <ArrowRight size={14} /></span></button>; })}</div>
    </section>

    <section className="lux-flash">
      <div className="flash-copy"><span><Zap size={15} fill="currentColor" /> FLASH SALE</span><h2>The smartest tools.<br />Prices that won’t last.</h2><p>Save up to 40% on this week’s most wanted digital products.</p><Link to="/catalog">Shop flash sale <ArrowRight size={17} /></Link></div>
      <div className="flash-countdown"><span>ENDS IN</span><div><strong>08</strong><small>HOURS</small></div><b>:</b><div><strong>42</strong><small>MINUTES</small></div><b>:</b><div><strong>19</strong><small>SECONDS</small></div></div>
      <div className="flash-product"><div className="flash-art"><KeyRound size={55} /><span>-33%</span></div><div><small>TODAY’S HERO DEAL</small><h3>Microsoft 365<br />Annual access</h3><p><strong>{formatMoney(3950)}</strong><del>{formatMoney(5900)}</del></p><span><Star size={13} fill="currentColor" /> 4.95 · 2,100 reviews</span></div></div>
    </section>

    <section className="lux-section" id="products">
      <div className="lux-section-head"><div><span>CURATED FOR YOU</span><h2>{t("popularNow")}</h2></div><Link to="/catalog">View all products <ArrowRight size={16} /></Link></div>
      <div className="lux-tabs">{["All", ...categories.slice(0,6).map(c => c.name)].map(c => <button key={c} className={activeCategory === c ? "active" : ""} onClick={() => setActiveCategory(c)}>{c}</button>)}</div>
      {visibleProducts.length ? <div className="lux-product-grid">{visibleProducts.map(p => <ProductCard key={p.title} product={p} />)}</div> : <div className="lux-empty"><Search /><h3>No matching products</h3><p>Try another search or browse all categories.</p><button onClick={() => { setQuery(""); setActiveCategory("All"); }}>Reset filters</button></div>}
    </section>

    <section className="lux-new-section"><div className="lux-section-head"><div><span>FRESH TO THE MARKET</span><h2>{t("newArrivals")}</h2></div><Link to="/catalog">See what’s new <ArrowRight size={16} /></Link></div><div className="lux-new-grid">{displayProducts.slice().reverse().slice(0,4).map(p => <ProductCard key={`new-${p.title}`} product={{...p, badge: "Just in"}} />)}</div></section>

    <section className="lux-sellers lux-section" id="sellers">
      <div className="lux-section-head"><div><span>THE BEST OF HSELLO</span><h2>Top sellers</h2></div><Link to="/catalog">Discover all stores <ArrowRight size={16} /></Link></div>
      <div className="lux-seller-grid">{sellers.map((s, i) => <article key={s.name}><span className="seller-rank">0{i+1}</span><div className={`seller-avatar accent-${s.accent}`}>{s.mark}</div><div className="seller-name"><h3>{s.name} <BadgeCheck size={15} /></h3><p>{s.focus}</p></div><div className="seller-stats"><span><Star size={14} fill="currentColor" /> {s.score}</span><span>{s.sales} sales</span></div><div className="seller-tags"><span>Instant delivery</span><span>Fast support</span></div><Link to="/catalog">Visit store <ArrowRight size={15} /></Link></article>)}</div>
    </section>

    <section className="lux-seller-cta"><div><span>SELL WITH HSELLO</span><h2>Your digital business<br />deserves a better stage.</h2><p>Reach buyers worldwide with secure payouts, powerful analytics and a storefront built to convert.</p><Link to="/seller/apply">Start selling today <ArrowRight size={17} /></Link></div><div className="cta-console"><div><span>THIS MONTH</span><strong>$24,850</strong><small>Gross sales <b>+18.6%</b></small></div><div className="mini-chart"><i/><i/><i/><i/><i/><i/><i/></div><footer><span><Store size={18}/> 1,284 active sellers</span><span><Globe2 size={18}/> 120+ countries</span></footer></div></section>

    <section className="lux-journal lux-section" id="journal"><div className="lux-section-head"><div><span>THE HSELLO JOURNAL</span><h2>Ideas worth opening</h2></div><Link to="/blog">Read all stories <ArrowRight size={16} /></Link></div><div className="lux-blog-grid">{blogPosts.map((post, i) => <article key={post.title}><Link to="/blog" className={`blog-art accent-${post.accent}`}><span>0{i+1}</span><Sparkles /></Link><div><span>{post.tag} · {post.date}</span><h3><Link to="/blog">{post.title}</Link></h3><p>{post.excerpt}</p><Link to="/blog">Read article <ArrowRight size={15} /></Link></div></article>)}</div></section>

    <section className="lux-newsletter"><div><span>STAY AHEAD</span><h2>The best of the digital market,<br />once a week.</h2></div><form onSubmit={e => e.preventDefault()}><input type="email" placeholder="Email address" aria-label="Email address"/><button>Join the newsletter <ArrowRight size={16}/></button><small>No noise. Just new products, useful guides and sharp offers.</small></form></section>

    <footer className="lux-footer"><div className="footer-lead"><Link className="lux-logo" to="/"><span>H</span><div><strong>HSELLO</strong><small>DIGITAL MARKET</small></div></Link><p>The premium marketplace for trusted digital products and expert services.</p><div><span><ShieldCheck size={15}/> Secure checkout</span><span><Globe2 size={15}/> Global marketplace</span></div></div><div><strong>Marketplace</strong><a href="#categories">All categories</a><a href="#products">Popular products</a><a href="#sellers">Top sellers</a><Link to="/catalog">New arrivals</Link></div><div><strong>Sell</strong><Link to="/seller/apply">Become a seller</Link><Link to="/dashboard">Seller dashboard</Link><Link to="/support">Seller support</Link><Link to="/terms">Seller policy</Link></div><div><strong>Company</strong><Link to="/about">About us</Link><Link to="/blog">Journal</Link><Link to="/contact">Contact</Link><Link to="/support">Help center</Link></div><div><strong>Legal</strong><Link to="/buyer-protection">Buyer protection</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/prohibited-products">Prohibited products</Link></div><div className="footer-bottom"><span>© 2026 HSello Digital Market. All rights reserved.</span><span>Built for the world’s digital economy.</span></div></footer>
  </main>;
}
