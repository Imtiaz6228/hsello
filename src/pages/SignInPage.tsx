import { FormEvent, useState } from "react";
import { Github, LockKeyhole, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError, homePathForRole } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!email.includes("@") || !password) {
      setStatus({ type: "error", message: "Enter a valid email and password." });
      return;
    }

    setLoading(true);
    try {
      const user = await signIn({ email, password, rememberMe });
      setStatus({ type: "success", message: "Signed in successfully." });

      const destination = user.emailVerified
        ? (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? homePathForRole(user.role)
        : "/verify-required";

      navigate(destination, {
        replace: true,
        state: destination === "/verify-required" ? { email } : undefined
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof ApiError ? error.message : "Could not sign in. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Protected marketplace access"
      title="Welcome back to the exchange."
      subtitle="Sign in to manage orders, inventory and protected transactions from one secure workspace."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Welcome back</h2>
          <p>Enter your account details.</p>
        </div>

        {status ? <Alert type={status.type} message={status.message} /> : null}

        <label className="field" htmlFor="email">
          <span>Email address</span>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="form-row between">
          <label className="check-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button className="primary-button" type="submit" disabled={loading}>
          <LockKeyhole size={18} aria-hidden="true" />
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="social-grid" aria-label="Social sign in options">
          <button type="button" disabled>
            <Mail size={17} aria-hidden="true" />
            Google
          </button>
          <button type="button" disabled>
            <Github size={17} aria-hidden="true" />
            GitHub
          </button>
        </div>

        <p className="switch-auth">
          New here? <Link to="/register" state={location.state}>Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
