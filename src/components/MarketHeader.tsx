import { ArrowRight, LogOut, Menu, Search, ShoppingBag, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

export function MarketHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountPath = user ? (STAFF_ROLES.includes(user.role) ? "/admin" : user.role === "SELLER" ? "/seller" : "/dashboard") : "/sign-in";

  return (
    <header className="commerce-header">
      <Link className="brand-lockup" to="/"><span className="brand-glyph">H</span><span><strong>HSELLO</strong><small>DIGITAL EXCHANGE</small></span></Link>
      <button className="commerce-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label={t("menu")}><Menu /></button>
      <nav className={menuOpen ? "open" : ""} aria-label="Marketplace">
        <button className="commerce-menu-close" type="button" onClick={() => setMenuOpen(false)} aria-label={t("close")}><X /></button>
        <div className="commerce-mobile-locale"><LocaleSwitcher /></div>
        <Link to="/catalog" onClick={() => setMenuOpen(false)}><Search size={15} /> {t("explore")}</Link>
        <Link to="/buyer-protection" onClick={() => setMenuOpen(false)}>{t("protection")}</Link>
        <Link to="/support" onClick={() => setMenuOpen(false)}>{t("support")}</Link>
        {!user ? <>
          <Link className="commerce-mobile-auth" to="/sign-in" onClick={() => setMenuOpen(false)}>{t("signIn")}</Link>
          <Link className="commerce-mobile-auth primary" to="/register" onClick={() => setMenuOpen(false)}><UserPlus size={16} /> {t("register")}</Link>
        </> : <>
          <Link className="commerce-mobile-auth" to={accountPath} onClick={() => setMenuOpen(false)}>{t("dashboard")}</Link>
          <Link className="commerce-mobile-auth danger" to="/sign-out" onClick={() => setMenuOpen(false)}><LogOut size={16} /> {t("signOut")}</Link>
        </>}
      </nav>
      <div className="commerce-header-actions">
        <LocaleSwitcher />
        <Link className="cart-link" to="/cart"><ShoppingBag size={17} /> {t("cart")} <b>{count}</b></Link>
        <Link className="header-account" to={accountPath}>{user ? t("account") : t("signIn")} <ArrowRight size={15} /></Link>
        {!user ? <Link className="header-register" to="/register">{t("register")}</Link> : null}
      </div>
      {menuOpen ? <button className="commerce-menu-scrim" aria-label={t("close")} onClick={() => setMenuOpen(false)} /> : null}
    </header>
  );
}

export function MarketFooter() {
  return (
    <footer className="commerce-footer">
      <div><span className="brand-glyph">H</span><p>Original digital goods and expert services, protected end to end.</p></div>
      <div><strong>Marketplace</strong><Link to="/catalog">Browse products</Link><Link to="/blog">Guides</Link><Link to="/support">Support</Link></div>
      <div><strong>Trust & legal</strong><Link to="/buyer-protection">Buyer protection</Link><Link to="/prohibited-products">Prohibited products</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div>
      <div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/seller-policy">Seller policy</Link><Link to="/copyright">IP complaints</Link></div>
      <small>© 2026 HSello Digital Exchange. Verified sellers. Protected accounts. Secure checkout.</small>
    </footer>
  );
}
