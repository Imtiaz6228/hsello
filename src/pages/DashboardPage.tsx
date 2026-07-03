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
    <main className="app-page">
      <nav className="topbar">
        <strong>Account</strong>
        <button type="button" className="secondary-button" onClick={() => void signOut()}>Sign out</button>
      </nav>
      <section className="dashboard-card">
        <span className="role-pill">{user.role.replace("_", " ")}</span>
        <h1>Welcome, {user.firstName}</h1>
        <p>You are signed in as {user.email}.</p>
        {STAFF_ROLES.includes(user.role) ? <Link className="primary-link" to="/admin">Open admin panel</Link> : null}
      </section>
    </main>
  );
}
