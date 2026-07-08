import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, BadgeDollarSign, Bitcoin, Building2, Check, CreditCard, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type Method = { id: "STRIPE" | "PAYPAL" | "BANK_TRANSFER" | "CRYPTO" | "MANUAL"; label: string; available: boolean; kind: string };
const icons = { STRIPE: CreditCard, PAYPAL: WalletCards, BANK_TRANSFER: Building2, CRYPTO: Bitcoin, MANUAL: BadgeDollarSign };

export function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotalCents } = useCart();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<Method[]>([
    { id: "STRIPE", label: "Card / Stripe", available: true, kind: "hosted" },
    { id: "PAYPAL", label: "PayPal", available: true, kind: "hosted" },
    { id: "BANK_TRANSFER", label: "Local bank transfer", available: true, kind: "manual" },
    { id: "CRYPTO", label: "Crypto", available: true, kind: "manual" },
    { id: "MANUAL", label: "Manual approval", available: true, kind: "manual" }
  ]);
  const [method, setMethod] = useState<Method["id"]>("STRIPE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void apiRequest<{ methods: Method[] }>("/api/commerce/payment-methods").then((data) => { setMethods(data.methods); const first = data.methods.find((item) => item.available); if (first) setMethod(first.id); }).catch(() => undefined); }, []);
  if (!items.length) return <Navigate to="/cart" replace />;

  async function placeOrder(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await apiRequest<{ order: { id: string }; redirectUrl?: string; instructions?: string }>("/api/commerce/checkout", {
        method: "POST", body: { items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })), method }
      });
      if (data.redirectUrl) { location.assign(data.redirectUrl); return; }
      navigate(`/checkout/confirmation?order=${data.order.id}`, { state: { instructions: data.instructions } });
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Checkout could not be completed."); setBusy(false); }
  }

  return (
    <main className="commerce-page checkout-page">
      <Seo title="Secure checkout" description="Complete your protected HSello order with card, PayPal, bank transfer, crypto, or manual approval." />
      <MarketHeader />
      <form className="checkout-layout" onSubmit={placeOrder}>
        <section className="checkout-main">
          <Link className="back-link" to="/cart"><ArrowLeft /> Back to cart</Link>
          <span className="section-index">SECURE CHECKOUT</span><h1>Choose how to pay.</h1>
          <div className="checkout-account"><span>{user?.firstName[0]}{user?.lastName[0]}</span><div><small>CHECKING OUT AS</small><strong>{user?.firstName} {user?.lastName}</strong><p>{user?.email}</p></div><Check /></div>
          <div className="payment-methods">
            {methods.map((item) => { const Icon = icons[item.id]; return (
              <label className={`${method === item.id ? "selected" : ""} ${!item.available ? "disabled" : ""}`} key={item.id}>
                <input type="radio" name="payment" value={item.id} checked={method === item.id} onChange={() => setMethod(item.id)} disabled={!item.available} />
                <span><Icon /></span><div><strong>{item.label}</strong><small>{item.kind === "hosted" ? "Secure hosted payment" : "Payment verified by staff before delivery"}</small></div>{method === item.id ? <Check /> : null}
              </label>
            ); })}
          </div>
          <div className="checkout-approval-note"><ShieldCheck size={16} /> No coupon step. Manual payments are delivered automatically after admin approval.</div>
          {error ? <div className="notice error">{error}</div> : null}
        </section>
        <aside className="checkout-summary">
          <span className="section-index">ORDER SUMMARY</span>
          {items.map(({ product, quantity }) => <div className="checkout-line" key={product.id}><span>{product.icon}</span><div><strong>{product.title}</strong><small>Qty {quantity} · {product.delivery}</small></div><b>${(product.priceCents * quantity / 100).toFixed(2)}</b></div>)}
          <div className="checkout-totals"><p><span>Subtotal</span><b>${(subtotalCents / 100).toFixed(2)}</b></p><p><span>Delivery</span><b>$0.00</b></p><p><span>Total</span><b>${(subtotalCents / 100).toFixed(2)}</b></p></div>
          <button className="pay-button" type="submit" disabled={busy}><LockKeyhole /> {busy ? "Creating secure order…" : `Pay $${(subtotalCents / 100).toFixed(2)}`}</button>
          <p className="secure-note"><ShieldCheck /> Encrypted checkout · payment confirmation required · buyer protection included</p>
        </aside>
      </form>
    </main>
  );
}
