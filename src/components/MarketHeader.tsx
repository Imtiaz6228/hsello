import { ArrowRight, Search, ShoppingBag } from "lucide-react";
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
  const accountPath = user ? (STAFF_ROLES.includes(user.role) ? "/admin" : "/dashboard") : "/sign-in";
  return (
    <header className="commerce-header">
      <Link className="brand-lockup" to="/"><span className="brand-glyph">H</span><span><strong>HSELLO</strong><small>DIGITAL EXCHANGE</small></span></Link>
      <nav aria-label="Marketplace"><Link to="/catalog"><Search size={15} /> {t("explore")}</Link><Link to="/buyer-protection">{t("protection")}</Link><Link to="/support">{t("support")}</Link></nav>
      <div><LocaleSwitcher /><Link className="cart-link" to="/cart"><ShoppingBag size={17} /> {t("cart")} <b>{count}</b></Link><Link className="header-account" to={accountPath}>{user ? t("account") : t("signIn")} <ArrowRight size={15} /></Link></div>
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
      <small>© 2026 HSello Digital Exchange. Privacy-first accounts. Secure checkout.</small>
    </footer>
  );
}
