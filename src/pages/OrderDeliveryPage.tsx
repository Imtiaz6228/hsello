import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Download, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type Message = { id: string; body: string; createdAt: string; author: { firstName: string; role: string } };
type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  canOpenDispute?: boolean;
  disputeDeadline?: string;
  disputeWindowHours?: number;
  disputes: Array<{ status: string; subject: string }>;
  items: Array<{
    id: string;
    productName: string;
    product: { slug: string; type: string; deliveryNote?: string | null };
    downloadGrants: Array<{ id: string; downloadCount: number; maxDownloads: number; productFile: { displayName: string } }>;
    inventoryItems?: Array<{ id: string; content: string; deliveredAt?: string | null }>;
  }>;
};

export function OrderDeliveryPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [orderData, messageData] = await Promise.all([
        apiRequest<{ order: OrderDetail }>(`/api/commerce/orders/${id}`),
        apiRequest<{ messages: Message[] }>(`/api/commerce/orders/${id}/messages`)
      ]);
      setOrder(orderData.order);
      setMessages(messageData.messages);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load the order.");
    }
  };

  useEffect(() => { void load(); }, [id]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    try {
      await apiRequest(`/api/commerce/orders/${id}/messages`, { method: "POST", body: { body } });
      setBody("");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Message could not be sent.");
    }
  }

  async function openDispute() {
    const subject = window.prompt("Dispute subject (5+ characters):");
    if (!subject || subject.trim().length < 5) return;
    const description = window.prompt("Describe the issue (20+ characters):");
    if (!description || description.trim().length < 20) return;
    try {
      await apiRequest(`/api/commerce/orders/${id}/disputes`, { method: "POST", body: { subject, description } });
      await load();
      setError("Dispute opened. Admin support can now review this order workspace.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not open a dispute.");
    }
  }

  return (
    <main className="commerce-page order-workspace">
      <Seo title="Order delivery workspace" description="Protected buyer and seller messages for a HSello order." />
      <MarketHeader />
      <section>
        <Link className="back-link" to="/dashboard"><ArrowLeft /> Back to dashboard</Link>
        <span className="section-index">PROTECTED ORDER WORKSPACE</span>
        <h1>Delivery & messages</h1>
        <p><ShieldCheck /> Buyer and seller chat opens only after an order exists. Disputes are limited to the seller’s after-sales window.</p>
      </section>

      {order ? (
        <section className="order-delivery-summary">
          <header>
            <div>
              <span className={`status-pill ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span>
              <strong>{order.orderNumber}</strong>
              <small>Dispute window: {order.disputeWindowHours ?? 12}h · {order.disputeDeadline ? `until ${new Date(order.disputeDeadline).toLocaleString()}` : "after payment"}</small>
            </div>
            {order.canOpenDispute ? <button className="secondary-button" onClick={() => void openDispute()}><ShieldCheck size={14} /> Open dispute</button> : null}
          </header>
          {order.items.map((item) => (
            <article className="order-delivery-item" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                {item.product.deliveryNote ? <small>{item.product.deliveryNote}</small> : null}
              </div>
              {item.downloadGrants.length ? item.downloadGrants.map((grant) => (
                <a key={grant.id} className="action-link" href={`/api/commerce/downloads/${grant.id}`}><Download size={14} /> {grant.productFile.displayName} <small>({grant.maxDownloads - grant.downloadCount} left)</small></a>
              )) : null}
              {item.inventoryItems?.length ? (
                <div className="digital-delivery-rows">
                  {item.inventoryItems.map((row) => <code key={row.id}>{row.content}</code>)}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <div className="order-chat">
        {error ? <div className="notice error">{error}</div> : null}
        {messages.length ? messages.map((message) => <article key={message.id}><span>{message.author.firstName[0]}</span><div><header><strong>{message.author.firstName}</strong><small>{message.author.role.replace("_", " ")} · {new Date(message.createdAt).toLocaleString()}</small></header><p>{message.body}</p></div></article>) : <div className="no-tickets"><MessageCircle /><strong>No messages yet</strong><p>Start the order conversation below.</p></div>}
        <form onSubmit={send}><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message about delivery…" rows={4} /><button><Send /> Send message</button></form>
      </div>
    </main>
  );
}
