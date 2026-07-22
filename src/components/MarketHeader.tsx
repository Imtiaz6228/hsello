import {
  ArrowRight,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
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
        <span className="brand-glyph">H</span>
        <span>
          <strong>HSELLO</strong>
          <small>DIGITAL MARKETPLACE</small>
        </span>
      </Link>
      <form className="commerce-global-search" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <input
          value={globalQuery}
          onChange={(event) => setGlobalQuery(event.target.value)}
          aria-label="Search the marketplace"
          placeholder="Search products, services, and creators"
        />
        <button type="submit" aria-label="Search">
          <ArrowRight aria-hidden="true" />
        </button>
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
        <Link
          to="/catalog"
          aria-current={pageCurrent("/catalog")}
          onClick={() => setMenuOpen(false)}
        >
          {t("explore")}
        </Link>
        <Link to="/catalog#departments" onClick={() => setMenuOpen(false)}>
          {t("categories")}
        </Link>
        <Link
          to="/seller/apply"
          aria-current={pageCurrent("/seller/apply")}
          onClick={() => setMenuOpen(false)}
        >
          {t("sellOn")}
        </Link>
        <Link
          to="/buyer-protection"
          aria-current={pageCurrent("/buyer-protection")}
          onClick={() => setMenuOpen(false)}
        >
          {t("protection")}
        </Link>
        <Link
          to="/support"
          aria-current={pageCurrent("/support")}
          onClick={() => setMenuOpen(false)}
        >
          {t("support")}
        </Link>
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
          {user ? t("account") : t("signIn")} <ArrowRight size={15} />
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
        <span className="brand-glyph">H</span>
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
        © 2026 HSello Digital Exchange. Verified sellers. Protected accounts.
        Secure checkout.
      </small>
    </footer>
  );
}
