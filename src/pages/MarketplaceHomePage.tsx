import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock3,
  Cloud,
  CreditCard,
  Gamepad2,
  Gift,
  Globe2,
  Heart,
  KeyRound,
  Layers3,
  LifeBuoy,
  Mail,
  MessageCircle,
  PackageCheck,
  Quote,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  WalletCards,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
  useMarketplaceStores,
} from "../commerce/useMarketplace";
import { useCart } from "../commerce/CartContext";
import { categoryMatches } from "../commerce/catalogHierarchy";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import type { CatalogProduct } from "../data/catalog";
import { Seo } from "../components/Seo";
import { marketplaceArtworkFor } from "../data/marketplaceVisuals";
import { useLocale } from "../i18n/LocaleContext";

type Category = {
  slug?: string;
  name: string;
  short: string;
  description: string;
  subcategories: string[];
  subDetails?: Record<string, Array<{ name: string; slug: string }>>;
  icon: LucideIcon;
  accent: string;
};
type Product = {
  slug?: string;
  categorySlug?: string;
  imageUrl?: string | null;
  category: string;
  title: string;
  seller: string;
  price: number;
  oldPrice?: number;
  rating: string;
  reviews: string;
  delivery: string;
  badge?: string;
  icon: LucideIcon;
  accent: string;
  tags: string[];
  description?: string;
  catalogProduct?: CatalogProduct;
};

const fallbackCategories: Category[] = [
  {
    name: "Social media",
    short: "Social",
    description: "Creator resources and growth tools",
    subcategories: [
      "Instagram",
      "TikTok",
      "Facebook",
      "X / Twitter",
      "LinkedIn",
      "Snapchat",
    ],
    icon: Users,
    accent: "purple",
  },
  {
    name: "Email products",
    short: "Email",
    description: "Mail tools and business resources",
    subcategories: [
      "Gmail",
      "Outlook",
      "Yahoo",
      "Proton Mail",
      "iCloud",
      "Business mail",
    ],
    icon: Mail,
    accent: "orange",
  },
  {
    name: "AI & productivity",
    short: "AI tools",
    description: "Premium tools for modern work",
    subcategories: [
      "ChatGPT",
      "Claude",
      "Midjourney",
      "Gemini",
      "Perplexity",
      "Copilot",
    ],
    icon: Bot,
    accent: "blue",
  },
  {
    name: "Streaming",
    short: "Streaming",
    description: "Creator assets and streaming workflows",
    subcategories: [
      "Netflix",
      "Spotify",
      "Disney+",
      "YouTube",
      "Prime Video",
      "Hulu",
    ],
    icon: Cloud,
    accent: "pink",
  },
  {
    name: "Messaging",
    short: "Messaging",
    description: "Communication tools and services",
    subcategories: [
      "Telegram",
      "Discord",
      "WhatsApp",
      "Signal",
      "Viber",
      "LINE",
    ],
    icon: MessageCircle,
    accent: "green",
  },
  {
    name: "Gaming",
    short: "Gaming",
    description: "Guides, creator assets and coaching",
    subcategories: [
      "Steam",
      "PlayStation",
      "Xbox",
      "Epic Games",
      "Valorant",
      "Roblox",
    ],
    icon: Gamepad2,
    accent: "indigo",
  },
  {
    name: "Game art & UI",
    short: "Game assets",
    description: "Original interface and creator resources",
    subcategories: [
      "HUD kits",
      "Icon packs",
      "Streaming overlays",
      "Server templates",
      "UI sounds",
      "Game guides",
    ],
    icon: WalletCards,
    accent: "yellow",
  },
  {
    name: "Business kits",
    short: "Business",
    description: "Practical templates for independent teams",
    subcategories: [
      "Client onboarding",
      "Finance models",
      "Operations",
      "Ecommerce",
      "Project planning",
      "Reporting",
    ],
    icon: Gift,
    accent: "red",
  },
  {
    name: "Software",
    short: "Software",
    description: "Licenses and professional tools",
    subcategories: [
      "Windows",
      "Microsoft 365",
      "Adobe",
      "Canva",
      "Antivirus",
      "Developer tools",
    ],
    icon: KeyRound,
    accent: "cyan",
  },
  {
    name: "Coaching",
    short: "Coaching",
    description: "Skill development and review services",
    subcategories: [
      "Design critique",
      "Code review",
      "Portfolio review",
      "Marketing strategy",
      "Career planning",
      "Creative coaching",
    ],
    icon: TrendingUp,
    accent: "lime",
  },
  {
    name: "Privacy & security",
    short: "Security",
    description: "Training, checklists and safe workflows",
    subcategories: [
      "Security awareness",
      "Privacy checklists",
      "Backup planning",
      "Access reviews",
      "Incident templates",
      "Team training",
    ],
    icon: Wifi,
    accent: "teal",
  },
  {
    name: "Mobile resources",
    short: "Mobile",
    description: "App templates and travel workflows",
    subcategories: [
      "App UI kits",
      "Travel planners",
      "Mobile presets",
      "Device checklists",
      "Content templates",
      "Setup guides",
    ],
    icon: Smartphone,
    accent: "blue",
  },
];

const fallbackSellers = [
  {
    slug: "northstar-studio",
    name: "Northstar Studio",
    mark: "NS",
    focus: "Brand systems & publishing",
    status: "Verified profile",
    response: "Clear delivery terms",
    accent: "orange",
  },
  {
    slug: "pixel-supply",
    name: "Pixel Supply",
    mark: "PS",
    focus: "Interface & game assets",
    status: "Verified profile",
    response: "Digital delivery",
    accent: "indigo",
  },
  {
    slug: "neural-desk",
    name: "Neural Desk",
    mark: "ND",
    focus: "AI & productivity",
    status: "Verified profile",
    response: "Clear delivery terms",
    accent: "purple",
  },
  {
    slug: "inbox-atelier",
    name: "Inbox Atelier",
    mark: "IA",
    focus: "Email design & lifecycle",
    status: "Verified profile",
    response: "Product support",
    accent: "blue",
  },
];

const blogPosts = [
  {
    slug: "evaluate-digital-product-before-checkout",
    tag: "BUYER GUIDE",
    title: "How to evaluate a digital product before checkout",
    excerpt:
      "The simple checks that help you choose a clear listing and a reliable seller.",
    date: "July 8",
    accent: "purple",
  },
  {
    slug: "write-a-trustworthy-product-page",
    tag: "SELLER PLAYBOOK",
    title: "Write a product page buyers can actually trust",
    excerpt:
      "Specific descriptions, clearer delivery promises, and a support workflow that reduces confusion.",
    date: "July 5",
    accent: "orange",
  },
  {
    slug: "versioning-digital-downloads",
    tag: "CREATOR OPERATIONS",
    title: "A calm versioning strategy for digital downloads",
    excerpt:
      "Ship useful updates while keeping existing customers informed and supported.",
    date: "June 29",
    accent: "blue",
  },
];

const categoryArtworkFallbacks = [
  "/category-art/social-media.webp",
  "/category-art/ai-productivity.webp",
  "/category-art/design-creative.webp",
  "/category-art/software.webp",
  "/category-art/business.webp",
  "/category-art/courses.webp",
];

function categoryArtwork(category: Category, index: number) {
  const key = `${category.slug ?? ""} ${category.name}`.toLowerCase();
  if (key.includes("social")) return categoryArtworkFallbacks[0];
  if (key.includes("ai") || key.includes("productiv"))
    return categoryArtworkFallbacks[1];
  if (
    key.includes("design") ||
    key.includes("creative") ||
    key.includes("professional")
  )
    return categoryArtworkFallbacks[2];
  if (
    key.includes("software") ||
    key.includes("developer") ||
    key.includes("game")
  )
    return categoryArtworkFallbacks[3];
  if (key.includes("business") || key.includes("email"))
    return categoryArtworkFallbacks[4];
  if (
    key.includes("course") ||
    key.includes("stream") ||
    key.includes("subscription")
  )
    return categoryArtworkFallbacks[5];
  return categoryArtworkFallbacks[index % categoryArtworkFallbacks.length];
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  const { formatMoney } = useLocale();
  const { add } = useCart();
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const productPath = product.slug ? `/products/${product.slug}` : "/catalog";
  const artwork = marketplaceArtworkFor(
    product.category,
    product.categorySlug,
    product.title,
  );
  const salesCount =
    Number.parseInt(product.reviews.replace(/\D/g, ""), 10) || 0;
  return (
    <article className="lux-product-card">
      <button
        className={saved ? "lux-wishlist saved" : "lux-wishlist"}
        type="button"
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={saved}
        onClick={() => setSaved((current) => !current)}
      >
        <Heart fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <Link
        to={productPath}
        className={`lux-product-art accent-${product.accent}`}
        aria-label={`View ${product.title}`}
      >
        <img
          src={artwork}
          alt=""
          width="900"
          height="675"
          loading="lazy"
          decoding="async"
        />
        {product.badge && <span className="lux-badge">{product.badge}</span>}
        {product.oldPrice ? (
          <span className="lux-discount-badge">
            Save {Math.round((1 - product.price / product.oldPrice) * 100)}%
          </span>
        ) : null}
        <span className="product-art-icon">
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="art-name">{product.category}</span>
      </Link>
      <div className="lux-product-body">
        <div className="lux-product-main">
          <span className="lux-product-category">{product.category}</span>
          <Link to={productPath}>
            <h3>{product.title}</h3>
          </Link>
          <div className="lux-seller">
            <span aria-hidden="true">{product.seller.slice(0, 1)}</span>
            {product.seller} <BadgeCheck size={14} />
          </div>
          {product.description ? (
            <p className="lux-product-description">{product.description}</p>
          ) : null}
          <div className="lux-rating">
            <Star size={14} fill="currentColor" />{" "}
            <strong>{product.rating}</strong>
            <span>({product.reviews})</span>
            <i />
            <Clock3 size={13} />
            <span>{product.delivery}</span>
          </div>
        </div>
        <div className="lux-product-stat">
          <small>Availability</small>
          <strong>
            <PackageCheck aria-hidden="true" /> In stock
          </strong>
        </div>
        <div className="lux-product-stat">
          <small>Sales</small>
          <strong>{salesCount}</strong>
        </div>
        <div className="lux-price">
          <small>Price</small>
          <strong>{formatMoney(Math.round(product.price * 100))}</strong>
          {product.oldPrice && (
            <del>{formatMoney(Math.round(product.oldPrice * 100))}</del>
          )}
        </div>
        <div className="lux-card-actions">
          <Link className="lux-buy-button" to={productPath}>
            Buy now <ShoppingBag size={15} />
          </Link>
          <button
            type="button"
            className={added ? "lux-add-cart added" : "lux-add-cart"}
            aria-label={added ? "Added to cart" : "Add to cart"}
            disabled={!product.catalogProduct}
            onClick={() => {
              if (!product.catalogProduct) return;
              add(product.catalogProduct);
              setAdded(true);
              window.setTimeout(() => setAdded(false), 1600);
            }}
          >
            {added ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <ShoppingCart aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export function MarketplaceHomePage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const liveCatalogProducts = useMarketplaceProducts();
  const marketplaceCategories = useMarketplaceCategories();
  const approvedStores = useMarketplaceStores();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [browseCategory, setBrowseCategory] = useState("");
  const categories = useMemo<Category[]>(() => {
    const parents = marketplaceCategories.filter((item) => !item.parentId);
    if (!parents.length) return fallbackCategories;
    const icons: LucideIcon[] = [
      Users,
      Mail,
      Bot,
      Cloud,
      MessageCircle,
      Gamepad2,
      WalletCards,
      Gift,
      KeyRound,
      TrendingUp,
      Wifi,
      Smartphone,
    ];
    const accents = [
      "purple",
      "orange",
      "blue",
      "pink",
      "green",
      "indigo",
      "yellow",
      "red",
      "cyan",
      "lime",
      "teal",
      "blue",
    ];
    const preferredRoots = [
      "social-media",
      "ai-platforms",
      "professional-services",
      "games",
      "email-services",
      "subscription-platforms",
    ];
    return parents
      .map((parent, index) => {
        const children = marketplaceCategories.filter(
          (item) => item.parentId === parent.id,
        );
        return {
          slug: parent.slug,
          name: parent.name,
          short: parent.name.split(/\s+/).slice(0, 2).join(" "),
          description: parent.description,
          subcategories: children.map((item) => item.name),
          subDetails: Object.fromEntries(
            children.map((child) => [
              child.name,
              marketplaceCategories
                .filter((item) => item.parentId === child.id)
                .map((item) => ({ name: item.name, slug: item.slug })),
            ]),
          ),
          icon: icons[index % icons.length],
          accent: accents[index % accents.length],
        };
      })
      .sort((a, b) => {
        const ai = preferredRoots.indexOf(a.slug ?? "");
        const bi = preferredRoots.indexOf(b.slug ?? "");
        if (ai >= 0 || bi >= 0)
          return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        return a.name.localeCompare(b.name);
      });
  }, [marketplaceCategories]);
  const displayProducts = useMemo<Product[]>(
    () =>
      liveCatalogProducts.length
        ? liveCatalogProducts.map((product) => {
            const categoryPath = product.category.toLowerCase().split(" / ");
            const match = categories.find(
              (item) =>
                categoryPath.includes(item.name.toLowerCase()) ||
                item.subcategories.some((sub) =>
                  categoryPath.includes(sub.toLowerCase()),
                ),
            );
            const visual = {
              icon: match?.icon ?? ShoppingBag,
              accent: match?.accent ?? "purple",
            };
            return {
              slug: product.slug,
              categorySlug: product.categorySlug,
              imageUrl: product.imageUrl,
              category: product.category,
              title: product.title,
              seller: product.seller,
              price: product.priceCents / 100,
              rating: product.rating ? product.rating.toFixed(2) : "New",
              reviews: String(product.reviews),
              delivery: product.delivery,
              badge: product.badge,
              icon: visual.icon,
              accent: visual.accent,
              tags: [product.title, product.category, product.seller],
              description: product.description,
              catalogProduct: product,
            };
          })
        : [],
    [categories, liveCatalogProducts],
  );
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedCategory = categories.find(
      (category) => category.name === activeCategory,
    );
    return displayProducts.filter(
      (p) =>
        (activeCategory === "All" ||
          Boolean(
            p.categorySlug &&
            selectedCategory?.slug &&
            categoryMatches(
              p.categorySlug,
              selectedCategory.slug,
              marketplaceCategories,
            ),
          ) ||
          p.category === activeCategory ||
          selectedCategory?.subcategories.includes(p.category)) &&
        (!q ||
          [p.title, p.seller, p.category, ...p.tags].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
  }, [
    activeCategory,
    categories,
    displayProducts,
    marketplaceCategories,
    query,
  ]);
  function submitSearch(e: FormEvent) {
    e.preventDefault();
    navigate(
      `/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
    );
  }
  function pickCategory(name: string) {
    setBrowseCategory(name);
  }

  const mainCategories = categories.slice(0, 6);
  const focusedCategory =
    mainCategories.find((category) => category.name === browseCategory) ??
    mainCategories[0] ??
    categories[0];
  const featuredSellers = approvedStores.length
    ? approvedStores.slice(0, 8).map((store, index) => ({
        slug: store.slug,
        name: store.name,
        mark: store.mark,
        focus: store.about,
        status: "Admin approved",
        response: store.sales
          ? `${store.sales.toLocaleString()} sales`
          : "New verified store",
        accent: ["purple", "indigo", "blue", "orange"][index % 4],
        logoUrl: store.logoUrl,
      }))
    : import.meta.env.DEV
      ? fallbackSellers
      : [];
  return (
    <main className="lux-home pro-home commerce-page">
      <Seo
        title="Digital Products Marketplace — Software, Assets & Services | Ysello"
        description="Browse trusted digital products, software, creative assets, courses, and expert services from reviewed sellers with clear delivery and protected checkout."
        canonicalPath="/"
        type="website"
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ysello",
            url: window.location.origin,
            logo: `${window.location.origin}/icon-512.png`,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Ysello",
            url: window.location.origin,
            potentialAction: {
              "@type": "SearchAction",
              target: `${window.location.origin}/catalog?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Ysello digital products marketplace",
            description:
              "A curated marketplace for software, creative assets, courses, productivity tools, and expert digital services.",
            url: window.location.origin,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: Math.min(displayProducts.length, 10),
              itemListElement: displayProducts
                .slice(0, 10)
                .map((product, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: product.title,
                  url: `${window.location.origin}${product.slug ? `/products/${product.slug}` : "/catalog"}`,
                })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What can I buy on Ysello?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Ysello features approved digital products and expert services, including software, creative assets, business templates, courses, and productivity resources.",
                },
              },
              {
                "@type": "Question",
                name: "How does digital delivery work?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Each listing explains its delivery method and timing before checkout. Eligible instant-download products are made available through the buyer dashboard after payment.",
                },
              },
              {
                "@type": "Question",
                name: "Do I need to verify my email before using my account?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. New buyers can register and enter their account immediately without an email code or verification link.",
                },
              },
            ],
          },
        ]}
      />
      <MarketHeader />
      {/* Retained for reference while the shared marketplace header replaces it.
      <div className="lux-topbar">
        <span>
          <Sparkles size={14} /> Curated digital products with clear delivery
          terms
        </span>
        <Link to="/catalog">
          Explore the catalog <ArrowRight size={14} />
        </Link>
      </div>
      <header className="lux-header">
        <Link className="lux-logo" to="/" aria-label="Ysello home">
          <span>Y</span>
          <div>
            <strong>YSELLO</strong>
            <small>DIGITAL MARKET</small>
          </div>
        </Link>
        <nav
          id="homepage-navigation"
          className={mobileMenu ? "open" : ""}
          aria-label="Main navigation"
        >
          <button
            ref={closeButtonRef}
            className="mobile-close"
            onClick={() => {
              setMobileMenu(false);
              menuButtonRef.current?.focus();
            }}
            aria-label={t("close")}
          >
            <X />
          </button>
          <div className="mobile-locale-row">
            <LocaleSwitcher />
          </div>
          <a className="desktop-categories-link" href="#categories">
            {t("categories")} <ChevronDown size={14} />
          </a>
          <button
            ref={menuButtonRef}
            className={`mobile-catalog-trigger ${mobileCatalogOpen ? "active" : ""}`}
            type="button"
            onClick={() => setMobileCatalogOpen((open) => !open)}
          >
            {t("categories")} <ChevronDown size={16} />
          </button>
          {mobileCatalogOpen ? (
            <div className="mobile-catalog-panel">
              <div className="mobile-main-categories">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      type="button"
                      key={category.name}
                      className={
                        mobileCategory === category.name
                          ? `active accent-${category.accent}`
                          : `accent-${category.accent}`
                      }
                      onClick={() => setMobileCategory(category.name)}
                    >
                      <span>
                        <Icon />
                      </span>
                      {category.name}
                      <ChevronDown />
                    </button>
                  );
                })}
              </div>
              <div className="mobile-subcategory-list">
                <header>
                  <strong>{mobileCategory}</strong>
                  <Link to="/catalog" onClick={() => setMobileMenu(false)}>
                    View all
                  </Link>
                </header>
                {categories
                  .find((item) => item.name === mobileCategory)
                  ?.subcategories.map((platform) => (
                    <details key={platform}>
                      <summary>
                        <span>{platform.slice(0, 2).toUpperCase()}</span>
                        <strong>{platform}</strong>
                        <ChevronDown />
                      </summary>
                      <div>
                        {(() => {
                          const liveDetails =
                            categories.find(
                              (item) => item.name === mobileCategory,
                            )?.subDetails?.[platform] ?? [];
                          const options = liveDetails.length
                            ? liveDetails
                            : detailOptions(platform, mobileCategory).map(
                                (name) => ({
                                  name,
                                  slug:
                                    platformSlugs[platform] ??
                                    platform
                                      .toLowerCase()
                                      .replace(/[^a-z0-9]+/g, "-"),
                                }),
                              );
                          return options.map((detail) => (
                            <Link
                              key={`${platform}-${detail.name}`}
                              to={`/catalog?category=${encodeURIComponent(detail.slug)}${liveDetails.length ? "" : `&q=${encodeURIComponent(detail.name)}`}`}
                              onClick={() => setMobileMenu(false)}
                            >
                              {detail.name}
                              <ArrowRight />
                            </Link>
                          ));
                        })()}
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          ) : null}
          <a href="#products" onClick={() => setMobileMenu(false)}>
            {t("products")}
          </a>
          <a href="#sellers" onClick={() => setMobileMenu(false)}>
            {t("topSellers")}
          </a>
          <a href="#journal" onClick={() => setMobileMenu(false)}>
            {t("blog")}
          </a>
          <Link to="/seller/apply" onClick={() => setMobileMenu(false)}>
            {t("sellOn")}
          </Link>
          <div className="mobile-auth-links">
            {!user ? (
              <>
                <Link to="/sign-in" onClick={() => setMobileMenu(false)}>
                  {t("signIn")}
                </Link>
                <Link
                  className="primary"
                  to="/register"
                  onClick={() => setMobileMenu(false)}
                >
                  <UserPlus size={16} /> {t("register")}
                </Link>
              </>
            ) : (
              <>
                <Link to={accountPath} onClick={() => setMobileMenu(false)}>
                  {t("dashboard")}
                </Link>
                <Link
                  className="danger"
                  to="/sign-out"
                  onClick={() => setMobileMenu(false)}
                >
                  <LogOut size={16} /> {t("signOut")}
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className="lux-header-actions">
          <button
            className="menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label={t("menu")}
            aria-expanded={mobileMenu}
            aria-controls="homepage-navigation"
          >
            <Menu />
          </button>
          <LocaleSwitcher compact />
          <Link className="lux-signin" to={accountPath}>
            {user ? t("account") : t("signIn")}
          </Link>
          <Link className="lux-cart" to="/cart">
            <ShoppingBag size={18} />
            <span>{count}</span>
          </Link>
        </div>
      </header>
      */}

      <section className="pro-market-hero">
        <div className="homepage-hero-content">
          <div className="lux-hero-copy">
            <span className="homepage-hero-kicker">
              <Sparkles size={14} /> THE TRUSTED DIGITAL MARKETPLACE
            </span>
            <h1>
              Buy better.
              <br />
              Build faster.
            </h1>
            <p>
              Discover verified digital products and expert services with clear
              delivery, transparent seller information, and protected checkout.
            </p>
          </div>
          <form className="lux-search" onSubmit={submitSearch}>
            <Search size={21} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("homeSearch")}
              aria-label="Search products"
            />
            <button type="submit" aria-label={t("searchMarketplace")}>
              <span>Search marketplace</span>
              <ArrowRight />
            </button>
          </form>
          <div className="homepage-trending" aria-label="Trending searches">
            <span>Trending:</span>
            {["AI tools", "Design assets", "Business kits"].map((term) => (
              <Link
                key={term}
                to={`/catalog?q=${encodeURIComponent(term)}`}
              >
                {term}
              </Link>
            ))}
          </div>
          <div className="homepage-trust-badges">
            <span>
              <ShieldCheck aria-hidden="true" /> Protected checkout
            </span>
            <span>
              <BadgeCheck aria-hidden="true" /> Verified sellers
            </span>
            <span>
              <LifeBuoy aria-hidden="true" /> Order-linked support
            </span>
          </div>
          <div className="homepage-hero-actions">
            <Link to="/catalog">
              Explore marketplace <ArrowRight size={16} />
            </Link>
            <Link to="/seller/apply">Start selling</Link>
          </div>
          <div className="homepage-market-facts">
            <span>
              <strong>15K+</strong>
              <small>products</small>
            </span>
            <span>
              <strong>2,500+</strong>
              <small>sellers</small>
            </span>
            <span>
              <strong>120K+</strong>
              <small>customers</small>
            </span>
            <span>
              <strong>99.8%</strong>
              <small>secure orders</small>
            </span>
          </div>
        </div>
        <div className="homepage-hero-visual" aria-hidden="true">
          <img
            src="/marketplace-assets/hero-marketplace.webp"
            alt=""
            width="1584"
            height="990"
            loading="eager"
          />
          <span className="hero-floating-proof">
            <ShieldCheck size={16} /> Protected checkout
          </span>
        </div>
      </section>

      <section className="homepage-brand-trust" aria-label="Trusted teams">
        <span>TRUSTED BY DIGITAL TEAMS WORLDWIDE</span>
        <div>
          {["NORTHSTAR", "PIXELCRAFT", "ORBIT", "FRAMEKIT", "ATLAS"].map(
            (brand) => (
              <strong key={brand}>{brand}</strong>
            ),
          )}
        </div>
      </section>

      <section className="homepage-category-strip" id="categories">
        <div className="homepage-strip-head">
          <div>
            <span>MARKETPLACE DIRECTORY</span>
            <h2>All categories</h2>
          </div>
          <Link to="/catalog">
            Show all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="homepage-category-icons" aria-label="All categories">
          {categories.slice(0, 12).map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={`directory-${category.name}`}
                to={`/catalog?category=${encodeURIComponent(category.slug ?? "")}`}
              >
                <span className={`accent-${category.accent}`}>
                  <Icon aria-hidden="true" />
                </span>
                <strong>{category.short}</strong>
                <small>
                  {
                    displayProducts.filter((product) =>
                      product.category
                        .toLowerCase()
                        .includes(category.name.toLowerCase()),
                    ).length
                  }{" "}
                  products
                </small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="lux-section homepage-product-section" id="products">
        <div className="lux-section-head">
          <div>
            <span>EXPLORE PRODUCTS</span>
            <h2>{t("popularNow")}</h2>
          </div>
          <Link className="homepage-see-all" to="/catalog">
            See all products <ArrowRight size={16} />
          </Link>
        </div>
        <div
          className="lux-tabs"
          role="group"
          aria-label="Filter featured products"
        >
          {["All", ...categories.slice(0, 6).map((c) => c.name)].map((c) => (
            <button
              key={c}
              className={activeCategory === c ? "active" : ""}
              aria-pressed={activeCategory === c}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {visibleProducts.length ? (
          <div className="lux-product-grid marketplace-list">
            {visibleProducts.slice(0, 10).map((p) => (
              <ProductCard key={p.title} product={p} />
            ))}
          </div>
        ) : (
          <div className="lux-empty">
            <Search />
            <h3>No matching products</h3>
            <p>Try another search or browse all categories.</p>
            <button
              onClick={() => {
                setQuery("");
                setActiveCategory("All");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </section>

      {/* lux-quick-categories now use the richer visual category grid below. */}
      <section className="lux-section homepage-category-directory">
        <div className="lux-section-head">
          <div>
            <span>EXPLORE THE MARKETPLACE</span>
            <h2>{t("shopByCategory")}</h2>
          </div>
          <Link to="/catalog">
            Browse all categories <ArrowRight size={16} />
          </Link>
        </div>
        <div
          className="lux-main-category-row"
          role="group"
          aria-label="Main marketplace categories"
        >
          {mainCategories.map((c, index) => {
            const Icon = c.icon;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => pickCategory(c.name)}
                className={`${browseCategory === c.name ? "active " : ""}accent-${c.accent}`}
                aria-pressed={browseCategory === c.name}
              >
                <span className="category-artwork">
                  <img src={categoryArtwork(c, index)} alt="" />
                  <span className="category-symbol">
                    <Icon />
                  </span>
                </span>
                <span className="category-card-label">
                  <strong>{c.name}</strong>
                  <ArrowRight />
                </span>
              </button>
            );
          })}
        </div>
        {browseCategory && focusedCategory ? (
          <div className="lux-category-preview">
            <header>
              <div>
                <span>SELECTED DEPARTMENT</span>
                <h3>{focusedCategory.name}</h3>
                <p>{focusedCategory.description}</p>
              </div>
              <Link
                to={`/catalog?category=${encodeURIComponent(focusedCategory.slug ?? "")}`}
              >
                View all <ArrowRight />
              </Link>
            </header>
            <div className="lux-subcategory-preview-grid">
              {focusedCategory.subcategories.slice(0, 8).map((subcategory) => (
                <Link
                  key={subcategory}
                  to={`/catalog?category=${encodeURIComponent(focusedCategory.subDetails?.[subcategory]?.[0]?.slug ?? focusedCategory.slug ?? "")}&q=${encodeURIComponent(subcategory)}`}
                >
                  <span>{subcategory.slice(0, 2).toUpperCase()}</span>
                  <strong>{subcategory}</strong>
                  <small>
                    {(focusedCategory.subDetails?.[subcategory] ?? [])
                      .slice(0, 3)
                      .map((item) => item.name)
                      .join(" · ") || "Browse listings"}
                  </small>
                  <ArrowRight />
                </Link>
              ))}
            </div>
            {focusedCategory.subcategories.length > 8 ? (
              <Link
                className="lux-category-view-all"
                to={`/catalog?category=${encodeURIComponent(focusedCategory.slug ?? "")}`}
              >
                View all {focusedCategory.name} subcategories <ArrowRight />
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="lux-trust" aria-label="Marketplace protections">
        <div>
          <ShieldCheck />
          <span>
            <strong>Buyer protection</strong>
            <small>Eligible orders are covered</small>
          </span>
        </div>
        <div>
          <BadgeCheck />
          <span>
            <strong>Reviewed sellers</strong>
            <small>Profiles checked before selling</small>
          </span>
        </div>
        <div>
          <Clock3 />
          <span>
            <strong>Clear delivery</strong>
            <small>Timing shown before checkout</small>
          </span>
        </div>
        <div>
          <MessageCircle />
          <span>
            <strong>Order-linked support</strong>
            <small>Help stays with your purchase</small>
          </span>
        </div>
      </section>

      <section className="homepage-trust-banner">
        <div>
          <span>BUY WITH CONFIDENCE</span>
          <h2>Protection that stays with every eligible order.</h2>
          <p>
            Clear delivery terms, verified purchase records, and order-linked
            support help buyers choose with confidence.
          </p>
          <Link to="/buyer-protection">
            How buyer protection works <ArrowRight size={16} />
          </Link>
        </div>
        <img
          src="/marketplace-assets/buyer-protection.webp"
          alt="Illustration of protected digital checkout"
          width="1774"
          height="887"
          loading="lazy"
          decoding="async"
        />
      </section>

      <section className="lux-new-section homepage-deals-section" id="deals">
        <div className="lux-section-head">
          <div>
            <span>LIMITED-TIME VALUE</span>
            <h2>Best deals</h2>
          </div>
          <Link to="/catalog">
            View all deals <ArrowRight size={16} />
          </Link>
        </div>
        <div className="lux-new-grid">
          {displayProducts
            .slice()
            .reverse()
            .slice(0, 4)
            .map((p) => (
              <ProductCard
                key={`new-${p.title}`}
                product={{ ...p, badge: "Best deal" }}
              />
            ))}
        </div>
      </section>

      <section className="lux-sellers lux-section" id="sellers">
        <div className="lux-section-head">
          <div>
            <span>THE BEST OF YSELLO</span>
            <h2>Featured sellers</h2>
          </div>
          <Link to="/catalog">
            Discover all stores <ArrowRight size={16} />
          </Link>
        </div>
        <div className="lux-seller-grid">
          {featuredSellers.map((s, i) => (
            <article key={s.name}>
              <span className="seller-rank">0{i + 1}</span>
              <div className={`seller-avatar accent-${s.accent}`}>{s.mark}</div>
              <div className="seller-name">
                <h3>
                  {s.name} <BadgeCheck size={15} />
                </h3>
                <p>{s.focus}</p>
              </div>
              <div className="seller-stats">
                <span>
                  <BadgeCheck size={14} /> {s.status}
                </span>
                <span>{s.response}</span>
              </div>
              <div className="seller-performance">
                <span>
                  <strong>{["US", "GB", "AE", "SG"][i % 4]}</strong>
                  <small>Country</small>
                </span>
                <span>
                  <strong>{["Elite", "Pro", "Top", "Pro"][i % 4]}</strong>
                  <small>Level</small>
                </span>
                <span>
                  <strong>{[1240, 982, 760, 648][i % 4]}+</strong>
                  <small>Orders</small>
                </span>
              </div>
              <div className="seller-tags">
                <span>
                  <Star size={12} fill="currentColor" /> 4.9 rating
                </span>
                <span>Replies in ~1h</span>
                <span>Member since 2024</span>
              </div>
              <Link to={`/stores/${s.slug}`}>
                Explore their products <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="lux-seller-cta">
        <div>
          <span>SELL WITH YSELLO</span>
          <h2>
            Your digital business
            <br />
            deserves a better stage.
          </h2>
          <p>
            Organize listings, delivery, customer conversations, and storefront
            details in one workspace.
          </p>
          <Link to="/seller/apply">
            Start a seller application <ArrowRight size={17} />
          </Link>
        </div>
        <div className="seller-cta-visual">
          <img
            src="/marketplace-assets/seller-growth.webp"
            alt="Illustration of a growing digital storefront"
            width="1774"
            height="887"
            loading="lazy"
            decoding="async"
          />
          <span>
            <Store size={16} /> Professional seller workspace
          </span>
        </div>
      </section>

      <section className="lux-journal lux-section" id="journal">
        <div className="lux-section-head">
          <div>
            <span>THE YSELLO JOURNAL</span>
            <h2>Ideas worth opening</h2>
          </div>
          <Link to="/blog">
            Read all stories <ArrowRight size={16} />
          </Link>
        </div>
        <div className="lux-blog-grid">
          {blogPosts.map((post, i) => (
            <article key={post.title}>
              <Link
                to={`/blog/${post.slug}`}
                className={`blog-art accent-${post.accent}`}
                aria-label={`Read ${post.title}`}
              >
                <span>0{i + 1}</span>
                <Sparkles />
              </Link>
              <div>
                <span>
                  {post.tag} · {post.date}
                </span>
                <h3>
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p>{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`}>
                  Read article <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lux-section homepage-how-it-works">
        <div className="lux-section-head">
          <div>
            <span>THREE SIMPLE STEPS</span>
            <h2>From discovery to delivery.</h2>
          </div>
          <Link to="/buyer-protection">
            How Ysello works <ArrowRight size={16} />
          </Link>
        </div>
        <div className="homepage-step-grid">
          {[
            {
              icon: Search,
              number: "01",
              title: "Discover",
              text: "Search trusted listings and compare transparent seller, delivery, and support details.",
            },
            {
              icon: CreditCard,
              number: "02",
              title: "Purchase securely",
              text: "Check out through a protected order flow with a permanent purchase record.",
            },
            {
              icon: Rocket,
              number: "03",
              title: "Access & build",
              text: "Receive your product or service and keep support connected to the order.",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number}>
                <span>{step.number}</span>
                <Icon aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="homepage-why-ysello">
        <div>
          <span>WHY YSELLO</span>
          <h2>Everything a serious digital marketplace should feel like.</h2>
          <p>
            Clear information before checkout, consistent support after it, and
            a marketplace designed to help quality sellers stand out.
          </p>
          <Link to="/about">
            Learn about Ysello <ArrowRight size={16} />
          </Link>
        </div>
        <div className="homepage-benefit-grid">
          {[
            {
              icon: ShieldCheck,
              title: "Protected orders",
              text: "Purchase records and buyer safeguards stay connected.",
            },
            {
              icon: BadgeCheck,
              title: "Reviewed sellers",
              text: "Profiles are reviewed before marketplace access.",
            },
            {
              icon: Layers3,
              title: "Curated catalog",
              text: "Clear categories and listing standards reduce noise.",
            },
            {
              icon: LifeBuoy,
              title: "Human support",
              text: "Support follows the order instead of disappearing.",
            },
          ].map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="homepage-statistics"
        aria-label="Marketplace statistics"
      >
        <div>
          <Globe2 aria-hidden="true" />
          <span>MARKETPLACE AT A GLANCE</span>
          <h2>One global marketplace. Thousands of ways to build.</h2>
        </div>
        <dl>
          <div>
            <dt>Products</dt>
            <dd>15K+</dd>
          </div>
          <div>
            <dt>Verified sellers</dt>
            <dd>2.5K+</dd>
          </div>
          <div>
            <dt>Customers</dt>
            <dd>120K+</dd>
          </div>
          <div>
            <dt>Secure orders</dt>
            <dd>99.8%</dd>
          </div>
        </dl>
      </section>

      <section className="lux-section homepage-testimonials">
        <div className="lux-section-head">
          <div>
            <span>BUILT ON TRUST</span>
            <h2>Chosen by digital builders.</h2>
          </div>
        </div>
        <div className="homepage-testimonial-grid">
          {[
            {
              quote:
                "The product details are clear, delivery is fast, and I always know where to get support.",
              name: "Maya Chen",
              role: "Creative director",
              initials: "MC",
            },
            {
              quote:
                "Ysello feels focused. I can compare sellers and make a decision without fighting the interface.",
              name: "Omar Farooq",
              role: "Independent founder",
              initials: "OF",
            },
            {
              quote:
                "A polished storefront and a serious order workflow make our digital products easier to trust.",
              name: "Lina Brooks",
              role: "Template creator",
              initials: "LB",
            },
          ].map((testimonial) => (
            <article key={testimonial.name}>
              <Quote aria-hidden="true" />
              <div className="testimonial-rating" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} fill="currentColor" aria-hidden="true" />
                ))}
              </div>
              <blockquote>{testimonial.quote}</blockquote>
              <footer>
                <span>{testimonial.initials}</span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.role}</small>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="lux-section homepage-faq" aria-labelledby="faq-title">
        <div className="lux-section-head">
          <div>
            <span>MARKETPLACE HELP</span>
            <h2 id="faq-title">Digital shopping, made clearer.</h2>
          </div>
          <Link to="/support">
            Visit support <ArrowRight size={16} />
          </Link>
        </div>
        <div className="homepage-faq-grid">
          <details>
            <summary>What can I buy on Ysello?</summary>
            <p>
              Browse approved software, creative assets, business templates,
              courses, productivity resources, and expert digital services.
            </p>
          </details>
          <details>
            <summary>How does digital delivery work?</summary>
            <p>
              Every listing explains its delivery method and timing before
              checkout. Eligible instant downloads appear in your buyer
              dashboard after payment.
            </p>
          </details>
          <details>
            <summary>Is email verification required?</summary>
            <p>
              No. Register and enter your account immediately without an email
              code or verification link.
            </p>
          </details>
        </div>
      </section>

      <section className="lux-newsletter">
        <div>
          <span>LEARN BEFORE YOU BUY</span>
          <h2>
            Practical marketplace guidance,
            <br />
            without the noise.
          </h2>
        </div>
        <div className="newsletter-cta">
          <Link to="/blog">
            Explore field notes <ArrowRight size={16} />
          </Link>
          <small>
            Buying guides, seller playbooks, and product-delivery practices.
          </small>
        </div>
      </section>

      {/* The shared footer keeps every public storefront route consistent.
      <footer className="lux-footer">
        <div className="footer-lead">
          <Link className="lux-logo" to="/">
            <span>Y</span>
            <div>
              <strong>YSELLO</strong>
              <small>DIGITAL MARKET</small>
            </div>
          </Link>
          <p>
            The premium marketplace for trusted digital products and expert
            services.
          </p>
          <div>
            <span>
              <ShieldCheck size={15} /> Secure checkout
            </span>
            <span>
              <Globe2 size={15} /> Global marketplace
            </span>
          </div>
        </div>
        <div>
          <strong>Marketplace</strong>
          <a href="#categories">All categories</a>
          <a href="#products">Popular products</a>
          <a href="#sellers">Top sellers</a>
          <Link to="/catalog">New arrivals</Link>
        </div>
        <div>
          <strong>Sell</strong>
          <Link to="/seller/apply">Become a seller</Link>
          <Link to="/seller">Seller dashboard</Link>
          <Link to="/support">Seller support</Link>
          <Link to="/seller-policy">Seller policy</Link>
        </div>
        <div>
          <strong>Company</strong>
          <Link to="/about">About us</Link>
          <Link to="/blog">Journal</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/support">Help center</Link>
        </div>
        <div>
          <strong>Legal</strong>
          <Link to="/buyer-protection">Buyer protection</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/prohibited-products">Prohibited products</Link>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Ysello Digital Market. All rights reserved.</span>
          <span>Built for the world’s digital economy.</span>
        </div>
      </footer>
      */}
      <MarketFooter />
    </main>
  );
}
