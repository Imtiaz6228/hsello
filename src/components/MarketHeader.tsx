import {
  ArrowRight,
  BookOpen,
  Grid2X2,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

export function MarketHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountPath = user
    ? STAFF_ROLES.includes(user.role)
      ? "/admin"
      : user.role === "SELLER"
        ? "/seller"
        : "/dashboard"
    : "/sign-in";

  useEffect(() => {
    if (!menuOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        navigationRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [location.hash, location.pathname]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const searchSuggestions = [
    "AI productivity tools",
    "Social media templates",
    "Business starter kits",
    "Creative assets",
    "Software licenses",
  ].filter((item) =>
    item.toLowerCase().includes(globalQuery.trim().toLowerCase()),
  );

  function pageCurrent(path: string) {
    return location.pathname === path ? ("page" as const) : undefined;
  }

  function closeMenu() {
    setMenuOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = globalQuery.trim();
    navigate(`/catalog${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setMenuOpen(false);
  }

  return (
    <header className="commerce-header">
      <Link className="brand-lockup" to="/">
        <img
          className="brand-glyph"
          src="/ysello-mark.svg"
          alt=""
          width="44"
          height="44"
        />
        <span>
          <strong>YSELLO</strong>
          <small>DIGITAL MARKETPLACE</small>
        </span>
      </Link>
      <form className="commerce-global-search" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <input
          ref={searchInputRef}
          value={globalQuery}
          onChange={(event) => setGlobalQuery(event.target.value)}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
          aria-label="Search the marketplace"
          aria-autocomplete="list"
          aria-controls="marketplace-search-suggestions"
          aria-expanded={searchOpen}
          placeholder="Search products, services, and creators"
        />
        <kbd aria-label="Keyboard shortcut">/</kbd>
        <button type="submit" aria-label="Search">
          <ArrowRight aria-hidden="true" />
        </button>
        {searchOpen ? (
          <div
            id="marketplace-search-suggestions"
            className="commerce-search-suggestions"
            role="listbox"
            aria-label="Search suggestions"
          >
            <span>Trending searches</span>
            {(searchSuggestions.length
              ? searchSuggestions
              : ["Browse all products"]
            ).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const query =
                    suggestion === "Browse all products" ? "" : suggestion;
                  setGlobalQuery(query);
                  setSearchOpen(false);
                  navigate(
                    `/catalog${query ? `?q=${encodeURIComponent(query)}` : ""}`,
                  );
                }}
              >
                <Search aria-hidden="true" />
                <span>{suggestion}</span>
                <ArrowRight aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </form>
      <button
        ref={menuButtonRef}
        className="commerce-menu-button"
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-expanded={menuOpen}
        aria-controls="marketplace-navigation"
        aria-label={t("menu")}
      >
        <Menu aria-hidden="true" />
        <span>{t("categories")}</span>
      </button>
      <nav
        ref={navigationRef}
        id="marketplace-navigation"
        className={menuOpen ? "open" : ""}
        aria-label="Marketplace"
      >
        <button
          ref={closeButtonRef}
          className="commerce-menu-close"
          type="button"
          onClick={closeMenu}
          aria-label={t("close")}
        >
          <X aria-hidden="true" />
        </button>
        <div className="commerce-mobile-locale">
          <LocaleSwitcher />
        </div>
        <form className="commerce-mobile-search" onSubmit={submitSearch}>
          <Search aria-hidden="true" />
          <input
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
            aria-label="Search the marketplace"
            placeholder="Search marketplace"
          />
          <button type="submit" aria-label="Search">
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <p className="commerce-menu-label">Browse</p>
        <Link
          to="/"
          aria-current={pageCurrent("/")}
          onClick={() => setMenuOpen(false)}
        >
          <Home aria-hidden="true" /> Home
        </Link>
        <Link
          to="/catalog"
          aria-current={pageCurrent("/catalog")}
          onClick={() => setMenuOpen(false)}
        >
          <PackageSearch aria-hidden="true" /> Marketplace
        </Link>
        <Link to="/#products" onClick={() => setMenuOpen(false)}>
          <Grid2X2 aria-hidden="true" /> Products
        </Link>
        <Link to="/#categories" onClick={() => setMenuOpen(false)}>
          <Grid2X2 aria-hidden="true" /> {t("categories")}
        </Link>
        <Link to="/#sellers" onClick={() => setMenuOpen(false)}>
          <Store aria-hidden="true" /> Top sellers
        </Link>
        <Link to="/blog" onClick={() => setMenuOpen(false)}>
          <BookOpen aria-hidden="true" /> Guides
        </Link>
        <p className="commerce-menu-label">Sell & support</p>
        <Link
          to="/seller/apply"
          aria-current={pageCurrent("/seller/apply")}
          onClick={() => setMenuOpen(false)}
        >
          <Store aria-hidden="true" /> {t("sellOn")}
        </Link>
        <Link
          to="/buyer-protection"
          aria-current={pageCurrent("/buyer-protection")}
          onClick={() => setMenuOpen(false)}
        >
          <ShieldCheck aria-hidden="true" /> {t("protection")}
        </Link>
        <Link
          to="/support"
          aria-current={pageCurrent("/support")}
          onClick={() => setMenuOpen(false)}
        >
          <LifeBuoy aria-hidden="true" /> {t("support")}
        </Link>
        <Link
          to="/cart"
          aria-current={pageCurrent("/cart")}
          onClick={() => setMenuOpen(false)}
        >
          <ShoppingBag aria-hidden="true" /> {t("cart")} ({count})
        </Link>
        <p className="commerce-menu-label">Account</p>
        {!user ? (
          <>
            <Link
              className="commerce-mobile-auth"
              to="/sign-in"
              aria-current={pageCurrent("/sign-in")}
              onClick={() => setMenuOpen(false)}
            >
              {t("signIn")}
            </Link>
            <Link
              className="commerce-mobile-auth primary"
              to="/register"
              aria-current={pageCurrent("/register")}
              onClick={() => setMenuOpen(false)}
            >
              <UserPlus size={16} /> {t("register")}
            </Link>
          </>
        ) : (
          <>
            <Link
              className="commerce-mobile-auth"
              to={accountPath}
              aria-current={pageCurrent(accountPath)}
              onClick={() => setMenuOpen(false)}
            >
              {t("dashboard")}
            </Link>
            <Link
              className="commerce-mobile-auth danger"
              to="/sign-out"
              onClick={() => setMenuOpen(false)}
            >
              <LogOut size={16} /> {t("signOut")}
            </Link>
          </>
        )}
      </nav>
      <div className="commerce-header-actions">
        <LocaleSwitcher />
        <Link
          className="cart-link"
          to="/cart"
          aria-current={pageCurrent("/cart")}
        >
          <ShoppingBag size={17} /> {t("cart")} <b>{count}</b>
        </Link>
        <Link
          className="header-account"
          to={accountPath}
          aria-current={pageCurrent(accountPath)}
        >
          <span className="header-avatar" aria-hidden="true">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" />
            ) : user ? (
              `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`
            ) : (
              <UserRound />
            )}
          </span>
          <span>{user ? t("account") : t("signIn")}</span>
          <ArrowRight size={15} />
        </Link>
        {!user ? (
          <Link
            className="header-register"
            to="/register"
            aria-current={pageCurrent("/register")}
          >
            {t("register")}
          </Link>
        ) : null}
      </div>
      {menuOpen ? (
        <button
          type="button"
          className="commerce-menu-scrim"
          aria-label={t("close")}
          onClick={closeMenu}
        />
      ) : null}
    </header>
  );
}

export function MarketFooter() {
  return (
    <footer className="commerce-footer">
      <div>
        <img
          className="brand-glyph"
          src="/ysello-mark.svg"
          alt=""
          width="44"
          height="44"
        />
        <p>Original digital goods and expert services, protected end to end.</p>
      </div>
      <div>
        <strong>Marketplace</strong>
        <Link to="/catalog">Browse products</Link>
        <Link to="/blog">Guides</Link>
        <Link to="/support">Support</Link>
      </div>
      <div>
        <strong>Trust & legal</strong>
        <Link to="/buyer-protection">Buyer protection</Link>
        <Link to="/prohibited-products">Prohibited products</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </div>
      <div>
        <strong>Company</strong>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/seller-policy">Seller policy</Link>
        <Link to="/copyright">IP complaints</Link>
      </div>
      <small>
        © 2026 Ysello Digital Exchange. Verified sellers. Protected accounts.
        Secure checkout.
      </small>
    </footer>
  );
}
