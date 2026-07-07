import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Send, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, type SellerApplication } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Seo } from "../components/Seo";

type SellerForm = {
  userName: string;
  fullLegalName: string;
  phoneNumber: string;
  email: string;
  country: string;
  stateProvince: string;
  city: string;
  fullAddress: string;
  postalCode: string;
  storeName: string;
  storeDescription: string;
  productCategories: string;
  termsAccepted: boolean;
};

function initialForm(user: ReturnType<typeof useAuth>["user"]): SellerForm {
  return {
    userName: user?.username ?? "",
    fullLegalName: user ? `${user.firstName} ${user.lastName}` : "",
    phoneNumber: user?.phone ?? "",
    email: user?.email ?? "",
    country: user?.country ?? "",
    stateProvince: "",
    city: user?.city ?? "",
    fullAddress: "",
    postalCode: "",
    storeName: "",
    storeDescription: "",
    productCategories: "",
    termsAccepted: false
  };
}

export function SellerApplicationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<SellerForm>(() => initialForm(user));
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === "SELLER") {
      navigate("/seller", { replace: true });
      return;
    }

    setForm(initialForm(user));
    void apiRequest<{ application: SellerApplication | null }>("/api/seller/application")
      .then((data) => setApplication(data.application))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [navigate, user]);

  function updateField<K extends keyof SellerForm>(key: K, value: SellerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!form.termsAccepted) {
      setStatus({ type: "error", message: "Accept the seller terms to continue." });
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest<{ application: SellerApplication; message: string }>(
        "/api/seller/application",
        {
          method: "POST",
          body: {
            ...form,
            productCategories: form.productCategories
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          }
        }
      );
      setApplication(data.application);
      setStatus({ type: "success", message: "Seller application submitted. Admin review is now pending." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof ApiError ? error.message : "Could not submit seller application."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="center-page">
      <Seo title="Seller application" description="Apply for reviewed HSello seller access." />
      <form className="auth-form wide" onSubmit={submit}>
        <Link className="secondary-button" to="/dashboard"><ArrowLeft size={16} /> Dashboard</Link>
        <div className="form-heading">
          <Store size={22} aria-hidden="true" />
          <h2>Seller application</h2>
          <p>Buyer accounts open immediately. Seller stores are reviewed by admin before products can go live.</p>
        </div>

        {loading ? <Alert type="success" message="Checking your seller status..." /> : null}
        {status ? <Alert type={status.type} message={status.message} /> : null}
        {application ? (
          <Alert
            type={application.status === "REJECTED" ? "error" : "success"}
            message={`Your seller application is ${application.status.toLowerCase()}.`}
          />
        ) : null}

        {!application ? (
          <>
            <div className="form-grid two">
              <label className="field" htmlFor="sellerUserName"><span>Username</span><input id="sellerUserName" value={form.userName} onChange={(event) => updateField("userName", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerLegalName"><span>Legal name</span><input id="sellerLegalName" value={form.fullLegalName} onChange={(event) => updateField("fullLegalName", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerEmail"><span>Email</span><input id="sellerEmail" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerPhone"><span>Phone</span><input id="sellerPhone" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerCountry"><span>Country</span><input id="sellerCountry" value={form.country} onChange={(event) => updateField("country", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerState"><span>State / province</span><input id="sellerState" value={form.stateProvince} onChange={(event) => updateField("stateProvince", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerCity"><span>City</span><input id="sellerCity" value={form.city} onChange={(event) => updateField("city", event.target.value)} required /></label>
              <label className="field" htmlFor="sellerPostal"><span>Postal code</span><input id="sellerPostal" value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} required /></label>
            </div>

            <label className="field" htmlFor="sellerAddress"><span>Full address</span><input id="sellerAddress" value={form.fullAddress} onChange={(event) => updateField("fullAddress", event.target.value)} required /></label>
            <label className="field" htmlFor="storeName"><span>Store name</span><input id="storeName" value={form.storeName} onChange={(event) => updateField("storeName", event.target.value)} required /></label>
            <label className="field" htmlFor="storeCategories"><span>Product categories</span><input id="storeCategories" value={form.productCategories} onChange={(event) => updateField("productCategories", event.target.value)} placeholder="Templates, design assets, services" required /></label>
            <label className="field" htmlFor="storeDescription"><span>Store description</span><textarea id="storeDescription" rows={5} value={form.storeDescription} onChange={(event) => updateField("storeDescription", event.target.value)} required /></label>

            <label className="check-row">
              <input type="checkbox" checked={form.termsAccepted} onChange={(event) => updateField("termsAccepted", event.target.checked)} />
              <span>I accept the seller terms and product review rules.</span>
            </label>

            <button className="primary-button" type="submit" disabled={submitting}>
              <Send size={18} aria-hidden="true" />
              {submitting ? "Submitting..." : "Submit for admin review"}
            </button>
          </>
        ) : null}
      </form>
    </main>
  );
}
