import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, Bot, Check, ChevronDown, Clock3, Cloud,
  Gamepad2, Gift, Globe2, Headphones, KeyRound, Mail, Menu, MessageCircle,
  Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Star, Store,
  TrendingUp, Users, WalletCards, Wifi, X, Zap, type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Category = { name: string; short: string; description: string; subcategories: string[]; icon: LucideIcon; accent: string };
type Product = { category: string; title: string; seller: string; price: number; oldPrice?: number; rating: string; reviews: string; delivery: string; badge?: string; icon: LucideIcon; accent: string; tags: string[] };

const categories: Category[] = [
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

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  return <article className="lux-product-card">
    <Link to="/catalog" className={`lux-product-art accent-${product.accent}`} aria-label={`View ${product.title}`}>
      {product.badge && <span className="lux-badge">{product.badge}</span>}
      <span className="art-ring" /><Icon size={56} strokeWidth={1.45} /><span className="art-name">{product.category}</span>
    </Link>
    <div className="lux-product-body">
      <span className="lux-product-category">{product.category}</span>
      <Link to="/catalog"><h3>{product.title}</h3></Link>
      <div className="lux-seller"><BadgeCheck size={14} /> {product.seller}</div>
      <div className="lux-rating"><Star size={14} fill="currentColor" /> <strong>{product.rating}</strong><span>({product.reviews})</span><i /><Clock3 size={13} /><span>{product.delivery}</span></div>
      <div className="lux-price"><div><small>From</small><strong>${product.price.toFixed(2)}</strong>{product.oldPrice && <del>${product.oldPrice.toFixed(2)}</del>}</div><Link to="/catalog" aria-label="Open product"><ArrowRight size={18} /></Link></div>
    </div>
  </article>;
}

export function MarketplaceHomePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenu, setMobileMenu] = useState(false);
  const accountPath = user ? (STAFF_ROLES.includes(user.role) ? "/admin" : "/dashboard") : "/sign-in";
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => (activeCategory === "All" || p.category === activeCategory) && (!q || [p.title, p.seller, p.category, ...p.tags].some(v => v.toLowerCase().includes(q))));
  }, [activeCategory, query]);
  function submitSearch(e: FormEvent) { e.preventDefault(); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }
  function pickCategory(name: string) { setActiveCategory(name); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }

  return <main className="lux-home">
    <div className="lux-topbar"><span><Sparkles size={14} /> Summer marketplace event: up to 40% off selected products</span><Link to="/catalog">Shop the sale <ArrowRight size={14} /></Link></div>
    <header className="lux-header">
      <Link className="lux-logo" to="/" aria-label="HSello home"><span>H</span><div><strong>HSELLO</strong><small>DIGITAL MARKET</small></div></Link>
      <nav className={mobileMenu ? "open" : ""} aria-label="Main navigation">
        <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X /></button>
        <a href="#categories" onClick={() => setMobileMenu(false)}>Categories <ChevronDown size={14} /></a>
        <a href="#products" onClick={() => setMobileMenu(false)}>Products</a>
        <a href="#sellers" onClick={() => setMobileMenu(false)}>Top sellers</a>
        <a href="#journal" onClick={() => setMobileMenu(false)}>Blog</a>
        <Link to="/seller/apply">Sell on HSello</Link>
      </nav>
      <div className="lux-header-actions"><button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu /></button><Link className="lux-signin" to={accountPath}>{user ? "My account" : "Sign in"}</Link><Link className="lux-cart" to="/cart"><ShoppingBag size={18} /><span>0</span></Link></div>
    </header>

    <section className="lux-hero">
      <div className="lux-hero-copy">
        <span className="lux-eyebrow"><i /> THE PREMIUM DIGITAL MARKETPLACE</span>
        <h1>Everything digital.<br /><em>One trusted place.</em></h1>
        <p>Discover exceptional digital products, tools and services from verified sellers—delivered fast and protected from checkout to completion.</p>
        <form className="lux-search" onSubmit={submitSearch}><Search size={21} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="What are you looking for?" aria-label="Search products"/><button>Search marketplace</button></form>
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
      <div className="lux-section-head"><div><span>EXPLORE THE MARKETPLACE</span><h2>Shop by category</h2></div><Link to="/catalog">Browse all categories <ArrowRight size={16} /></Link></div>
      <div className="lux-category-grid">{categories.map(c => { const Icon = c.icon; return <button key={c.name} onClick={() => pickCategory(c.name)} className={`lux-category-card accent-${c.accent}`}><span className="category-symbol"><Icon /></span><span className="category-text"><strong>{c.name}</strong><small>{c.description}</small></span><span className="category-tags">{c.subcategories.slice(0,3).map(s => <i key={s}>{s}</i>)}</span><span className="category-more">+{c.subcategories.length - 3} more <ArrowRight size={14} /></span></button>; })}</div>
    </section>

    <section className="lux-flash">
      <div className="flash-copy"><span><Zap size={15} fill="currentColor" /> FLASH SALE</span><h2>The smartest tools.<br />Prices that won’t last.</h2><p>Save up to 40% on this week’s most wanted digital products.</p><Link to="/catalog">Shop flash sale <ArrowRight size={17} /></Link></div>
      <div className="flash-countdown"><span>ENDS IN</span><div><strong>08</strong><small>HOURS</small></div><b>:</b><div><strong>42</strong><small>MINUTES</small></div><b>:</b><div><strong>19</strong><small>SECONDS</small></div></div>
      <div className="flash-product"><div className="flash-art"><KeyRound size={55} /><span>-33%</span></div><div><small>TODAY’S HERO DEAL</small><h3>Microsoft 365<br />Annual access</h3><p><strong>$39.50</strong><del>$59.00</del></p><span><Star size={13} fill="currentColor" /> 4.95 · 2,100 reviews</span></div></div>
    </section>

    <section className="lux-section" id="products">
      <div className="lux-section-head"><div><span>CURATED FOR YOU</span><h2>Popular right now</h2></div><Link to="/catalog">View all products <ArrowRight size={16} /></Link></div>
      <div className="lux-tabs">{["All", ...categories.slice(0,6).map(c => c.name)].map(c => <button key={c} className={activeCategory === c ? "active" : ""} onClick={() => setActiveCategory(c)}>{c}</button>)}</div>
      {visibleProducts.length ? <div className="lux-product-grid">{visibleProducts.map(p => <ProductCard key={p.title} product={p} />)}</div> : <div className="lux-empty"><Search /><h3>No matching products</h3><p>Try another search or browse all categories.</p><button onClick={() => { setQuery(""); setActiveCategory("All"); }}>Reset filters</button></div>}
    </section>

    <section className="lux-new-section"><div className="lux-section-head"><div><span>FRESH TO THE MARKET</span><h2>New arrivals</h2></div><Link to="/catalog">See what’s new <ArrowRight size={16} /></Link></div><div className="lux-new-grid">{products.slice().reverse().slice(0,4).map(p => <ProductCard key={`new-${p.title}`} product={{...p, badge: "Just in"}} />)}</div></section>

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
