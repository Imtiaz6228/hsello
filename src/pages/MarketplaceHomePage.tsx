import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Clock3,
  Cloud,
  Gamepad2,
  Gift,
  Globe2,
  KeyRound,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
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
import { categoryMatches } from "../commerce/catalogHierarchy";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
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
  const [imageFailed, setImageFailed] = useState(false);
  const productPath = product.slug ? `/products/${product.slug}` : "/catalog";
  return (
    <article className="lux-product-card">
      <Link
        to={productPath}
        className={`lux-product-art accent-${product.accent} ${product.imageUrl && !imageFailed ? "has-image" : ""}`}
        aria-label={`View ${product.title}`}
      >
        {product.badge && <span className="lux-badge">{product.badge}</span>}
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={`${product.title} product preview`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <>
            <span className="art-ring" />
            <Icon size={56} strokeWidth={1.45} />
            <span className="art-name">{product.category}</span>
          </>
        )}
      </Link>
      <div className="lux-product-body">
        <span className="lux-product-category">{product.category}</span>
        <Link to={productPath}>
          <h3>{product.title}</h3>
        </Link>
        <div className="lux-seller">
          <BadgeCheck size={14} /> {product.seller}
        </div>
        <div className="lux-rating">
          <Star size={14} fill="currentColor" />{" "}
          <strong>{product.rating}</strong>
          <span>({product.reviews})</span>
          <i />
          <Clock3 size={13} />
          <span>{product.delivery}</span>
        </div>
        <div className="lux-price">
          <div>
            <small>From</small>
            <strong>{formatMoney(Math.round(product.price * 100))}</strong>
            {product.oldPrice && (
              <del>{formatMoney(Math.round(product.oldPrice * 100))}</del>
            )}
          </div>
          <Link to={productPath} aria-label="Open product">
            <ArrowRight size={18} />
          </Link>
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
        title="HSello — trusted digital products and expert services"
        description="Discover digital products and expert services with clear delivery terms, reviewed sellers, protected order records, and human support."
        canonicalPath="/"
        type="website"
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "HSello",
            url: window.location.origin,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "HSello",
            url: window.location.origin,
            potentialAction: {
              "@type": "SearchAction",
              target: `${window.location.origin}/catalog?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
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
        <Link className="lux-logo" to="/" aria-label="HSello home">
          <span>H</span>
          <div>
            <strong>HSELLO</strong>
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
        <div className="lux-hero-copy">
          <h1>
            {t("homeTitleA")}
            <br />
            {t("homeTitleB")}
          </h1>
          <p>{t("homeIntro")}</p>
        </div>
        <div className="pro-market-search-column">
          <form className="lux-search" onSubmit={submitSearch}>
            <Search size={21} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("homeSearch")}
              aria-label="Search products"
            />
            <button type="submit" aria-label={t("searchMarketplace")}>
              <span>{t("searchMarketplace")}</span>
              <ArrowRight />
            </button>
          </form>
          <div
            className="pro-market-search-hints"
            aria-label="Marketplace highlights"
          >
            <span>Verified sellers</span>
            <span>Protected checkout</span>
            <span>Instant delivery options</span>
          </div>
        </div>
      </section>

      {/* lux-quick-categories now use the richer visual category grid below. */}
      <section className="lux-section" id="categories">
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

      <section className="lux-section" id="products">
        <div className="lux-section-head">
          <div>
            <span>CURATED FOR YOU</span>
            <h2>{t("popularNow")}</h2>
          </div>
          <Link to="/catalog">
            View all products <ArrowRight size={16} />
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
          <div className="lux-product-grid">
            {visibleProducts.slice(0, 8).map((p) => (
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

      <section className="lux-new-section">
        <div className="lux-section-head">
          <div>
            <span>FRESH TO THE MARKET</span>
            <h2>{t("newArrivals")}</h2>
          </div>
          <Link to="/catalog">
            See what’s new <ArrowRight size={16} />
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
                product={{ ...p, badge: "Just in" }}
              />
            ))}
        </div>
      </section>

      <section className="lux-sellers lux-section" id="sellers">
        <div className="lux-section-head">
          <div>
            <span>THE BEST OF HSELLO</span>
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
              <div className={`seller-avatar accent-${s.accent}`}>
                {"logoUrl" in s && typeof s.logoUrl === "string" ? (
                  <img
                    src={s.logoUrl}
                    alt={`${s.name} logo`}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  s.mark
                )}
              </div>
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
              <div className="seller-tags">
                <span>Delivery details</span>
                <span>Support terms</span>
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
          <span>SELL WITH HSELLO</span>
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
        <div className="cta-console">
          <div>
            <span>SELLER WORKSPACE</span>
            <strong>One clear view</strong>
            <small>Listings, orders, support, and analytics</small>
          </div>
          <div className="mini-chart" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <footer>
            <span>
              <Store size={18} /> Storefront tools
            </span>
            <span>
              <Globe2 size={18} /> Multi-currency display
            </span>
          </footer>
        </div>
      </section>

      <section className="lux-journal lux-section" id="journal">
        <div className="lux-section-head">
          <div>
            <span>THE HSELLO JOURNAL</span>
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
            <span>H</span>
            <div>
              <strong>HSELLO</strong>
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
          <span>© 2026 HSello Digital Market. All rights reserved.</span>
          <span>Built for the world’s digital economy.</span>
        </div>
      </footer>
      */}
      <MarketFooter />
    </main>
  );
}
