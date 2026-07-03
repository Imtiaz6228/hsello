import { Link, useLocation } from "react-router-dom";

export function VerifyRequiredPage() {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <main className="center-page">
      <section className="message-card">
        <span className="role-pill">Email verification</span>
        <h1>Check your inbox</h1>
        <p>We sent a verification link{email ? ` to ${email}` : " to your email address"}.</p>
        <Link className="primary-link" to="/sign-in">Back to sign in</Link>
      </section>
    </main>
  );
}
