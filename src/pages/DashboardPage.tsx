import { ArrowRight, BadgeCheck, PackageCheck, ShieldCheck, Store, TrendingUp, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  async function signOut() {
    await logout();
    navigate("/sign-in", { replace: true });
  }

  return (
    <main className="app-page dashboard-page">
      <nav className="topbar dashboard-topbar">
        <Link className="brand-lockup" to="/">
          <span className="brand-glyph">H</span>
          <span><strong>HSELLO</strong><small>MY EXCHANGE</small></span>
        </Link>
        <div className="dashboard-nav-links"><Link to="/">Marketplace</Link><span>Dashboard</span></div>
        <button type="button" className="secondary-button" onClick={() => void signOut()}>Sign out</button>
      </nav>

      <section className="dashboard-hero">
        <div>
          <span className="role-pill"><BadgeCheck size={13} /> {user.role.replace("_", " ")}</span>
          <h1>Good to see you, {user.firstName}.</h1>
          <p>Your HSello account is ready for protected marketplace activity.</p>
        </div>
        <Link className="primary-link" to="/">Explore marketplace <ArrowRight size={17} /></Link>
      </section>

      <section className="dashboard-layout">
        <article className="dashboard-main-card">
          <div className="card-title-row"><div><span className="section-index">ACCOUNT OVERVIEW</span><h2>Your exchange profile</h2></div><span className="account-score">100%</span></div>
          <div className="profile-summary">
            <span className="profile-avatar">{user.firstName[0]}{user.lastName[0]}</span>
            <div><strong>{user.firstName} {user.lastName}</strong><span>@{user.username}</span><small>{user.email}</small></div>
            <span className="verified-chip"><ShieldCheck size={15} /> Verified</span>
          </div>
          <div className="dashboard-metrics">
            <div><PackageCheck /><span><strong>0</strong><small>Active orders</small></span></div>
            <div><TrendingUp /><span><strong>—</strong><small>Buyer rating</small></span></div>
            <div><Store /><span><strong>{user.role === "SELLER" ? "Live" : "Not started"}</strong><small>Seller status</small></span></div>
          </div>
        </article>

        <aside className="dashboard-side-card">
          <span className="section-index">QUICK START</span>
          <h2>Make your first move</h2>
          <Link to="/"><PackageCheck /> Browse live offers <ArrowRight /></Link>
          <Link to="/register"><Store /> Become a seller <ArrowRight /></Link>
          <button type="button"><UserRound /> Complete profile <ArrowRight /></button>
          {STAFF_ROLES.includes(user.role) ? <Link className="admin-shortcut" to="/admin"><ShieldCheck /> Open admin panel <ArrowRight /></Link> : null}
        </aside>
      </section>
    </main>
  );
}
