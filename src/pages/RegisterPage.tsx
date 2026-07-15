import { FormEvent, useCallback, useState } from "react";
import { Camera, Github, Mail, UserPlus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, homePathForRole } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { Captcha } from "../components/Captcha";
import { PasswordField } from "../components/PasswordField";
import { PasswordStrength } from "../components/PasswordStrength";

type RegisterForm = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  country: string;
  city: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

const initialForm: RegisterForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  country: "",
  city: "",
  termsAccepted: false,
  privacyAccepted: false
};

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [availability, setAvailability] = useState<{ email?: boolean; username?: boolean }>({});
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const checkAvailability = useCallback(async (field: "email" | "username", value: string) => {
    if (!value || (field === "username" && value.length < 3) || (field === "email" && !value.includes("@"))) {
      return;
    }

    const params = new URLSearchParams({ [field]: value });
    try {
      const data = await apiRequest<{ emailAvailable?: boolean; usernameAvailable?: boolean }>(
        `/api/auth/availability?${params.toString()}`
      );
      setAvailability((current) => ({
        ...current,
        [field]: field === "email" ? data.emailAvailable : data.usernameAvailable
      }));
    } catch {
      setAvailability((current) => ({ ...current, [field]: undefined }));
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (form.password !== form.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (!form.termsAccepted || !form.privacyAccepted) {
      setStatus({ type: "error", message: "Accept the terms and privacy policy to continue." });
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
    if (profilePicture) {
      payload.append("profilePicture", profilePicture);
    }
    if (captchaToken) {
      payload.append("captchaToken", captchaToken);
    }

    setLoading(true);
    try {
      const user = await register(payload);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? homePathForRole(user.role);
      navigate(destination, { replace: true });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof ApiError ? error.message : "Could not create account. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Join the marketplace"
      title="Your next trade starts here."
      subtitle="Create your buyer account now. Seller access is reviewed separately by marketplace staff."
    >
      <form className="auth-form wide" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Register</h2>
          <p>Complete your account information.</p>
        </div>

        {status ? <Alert type={status.type} message={status.message} /> : null}

        <div className="form-grid two">
          <label className="field" htmlFor="firstName">
            <span>First name</span>
            <input id="firstName" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} autoComplete="given-name" required />
          </label>
          <label className="field" htmlFor="lastName">
            <span>Last name</span>
            <input id="lastName" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} autoComplete="family-name" required />
          </label>
          <label className="field" htmlFor="username">
            <span>Username</span>
            <input
              id="username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              onBlur={() => void checkAvailability("username", form.username)}
              autoComplete="username"
              required
            />
            {availability.username === false ? <small className="field-error">Username is already taken.</small> : null}
            {availability.username === true ? <small className="field-success">Username is available.</small> : null}
          </label>
          <label className="field" htmlFor="registerEmail">
            <span>Email address</span>
            <input
              id="registerEmail"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              onBlur={() => void checkAvailability("email", form.email)}
              autoComplete="email"
              required
            />
            {availability.email === false ? <small className="field-error">Email is already registered.</small> : null}
            {availability.email === true ? <small className="field-success">Email is available.</small> : null}
          </label>
          <label className="field" htmlFor="phone">
            <span>Phone number</span>
            <input id="phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" required />
          </label>
          <label className="field" htmlFor="country">
            <span>Country</span>
            <input id="country" value={form.country} onChange={(event) => updateField("country", event.target.value)} autoComplete="country-name" required />
          </label>
          <label className="field" htmlFor="city">
            <span>City</span>
            <input id="city" value={form.city} onChange={(event) => updateField("city", event.target.value)} autoComplete="address-level2" />
          </label>
          <label className="field file-field" htmlFor="profilePicture">
            <span>Profile picture</span>
            <input
              id="profilePicture"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
            />
            <small><Camera size={14} aria-hidden="true" /> {profilePicture?.name ?? "Optional JPEG, PNG, or WebP"}</small>
          </label>
        </div>

        <div className="form-grid two">
          <PasswordField
            id="registerPassword"
            label="Password"
            value={form.password}
            onChange={(value) => updateField("password", value)}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            value={form.confirmPassword}
            onChange={(value) => updateField("confirmPassword", value)}
            autoComplete="new-password"
          />
        </div>

        <PasswordStrength value={form.password} />

        <div className="consent-stack">
          <label className="check-row">
            <input type="checkbox" checked={form.termsAccepted} onChange={(event) => updateField("termsAccepted", event.target.checked)} />
            <span>I accept the Terms & Conditions.</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={form.privacyAccepted} onChange={(event) => updateField("privacyAccepted", event.target.checked)} />
            <span>I agree to the Privacy Policy.</span>
          </label>
        </div>

        <Captcha onVerify={setCaptchaToken} />

        <button className="primary-button" type="submit" disabled={loading}>
          <UserPlus size={18} aria-hidden="true" />
          {loading ? "Creating account..." : "Create account"}
        </button>

        <div className="social-grid" aria-label="Social registration options">
          <button type="button" disabled><Mail size={17} aria-hidden="true" /> Google</button>
          <button type="button" disabled><Github size={17} aria-hidden="true" /> GitHub</button>
        </div>

        <p className="switch-auth">
          Already have an account? <Link to="/sign-in" state={location.state}>Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
