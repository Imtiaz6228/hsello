import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, LoaderCircle, MessageCircle } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useCart } from "../commerce/CartContext";
import { MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

export function OrderConfirmationPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { clear } = useCart();
  const orderId = params.get("order");
  const provider = params.get("provider");
  const instructions = (location.state as { instructions?: string } | null)?.instructions;
  const [state, setState] = useState<"confirming" | "paid" | "pending" | "error">(provider ? "confirming" : "pending");
  const [message, setMessage] = useState(instructions ?? "Your order is recorded and waiting for payment approval.");

  useEffect(() => {
    if (!orderId || !provider) return;
    void apiRequest(`/api/commerce/checkout/${orderId}/confirm`, { method: "POST" })
      .then(() => { setState("paid"); setMessage("Payment confirmed. Your downloads and invoice are ready in your dashboard, and a confirmation email is on its way."); clear(); })
      .catch((error) => { setState("error"); setMessage(error instanceof ApiError ? error.message : "We could not confirm this payment yet."); });
  }, [clear, orderId, provider]);

  return (
    <main className="commerce-page confirmation-page"><Seo title="Order confirmation" description="Payment and digital delivery status for your HSello order." /><MarketHeader />
      <section className={`confirmation-card ${state}`}>
        {state === "confirming" ? <LoaderCircle className="spin" /> : <CheckCircle2 />}
        <span className="section-index">{state === "paid" ? "PAYMENT CONFIRMED" : state === "error" ? "CONFIRMATION NEEDED" : "ORDER RECEIVED"}</span>
        <h1>{state === "paid" ? "It’s yours." : state === "confirming" ? "Confirming payment…" : "We’ve got your order."}</h1><p>{message}</p>
        {orderId ? <small>Order reference: {orderId.slice(0, 8).toUpperCase()}</small> : null}
        <div><Link className="primary-link" to="/dashboard"><Download /> Purchases & downloads</Link><Link to="/dashboard"><FileText /> View invoice</Link><Link to="/support"><MessageCircle /> Get support</Link></div>
      </section>
    </main>
  );
}
