import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type Message = { id: string; body: string; attachmentUrl?: string | null; attachmentName?: string | null; createdAt: string; author: { id?: string; firstName: string; role: string } };
type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  canOpenDispute?: boolean;
  disputeDeadline?: string;
  disputeWindowHours?: number;
  disputes: Array<{ id: string; status: string; subject: string; refundDemanded?: boolean; awaitingParty?: string | null; autoCloseAt?: string | null; resolution?: string | null }>;
  items: Array<{
    id: string;
    productName: string;
    product: { slug: string; type: string; deliveryNote?: string | null };
    downloadGrants: Array<{ id: string; downloadCount: number; maxDownloads: number; productFile: { displayName: string } }>;
    inventoryItems?: Array<{ id: string; content: string; deliveredAt?: string | null }>;
  }>;
};

export function OrderDeliveryPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const [orderData, messageData] = await Promise.all([
        apiRequest<{ order: OrderDetail }>(`/api/commerce/orders/${id}`),
        apiRequest<{ messages: Message[] }>(`/api/commerce/orders/${id}/messages`)
      ]);
      setOrder(orderData.order);
      setMessages(messageData.messages);
      if (!silent) setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load the order.");
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const payload = new FormData();
      payload.append("body", body);
      if (attachment) payload.append("attachment", attachment);
      await apiRequest(`/api/commerce/orders/${id}/messages`, { method: "POST", body: payload });
      setBody("");
      setAttachment(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function openDispute() {
    const subject = window.prompt("Dispute subject (5+ characters):");
    if (!subject || subject.trim().length < 5) return;
    const description = window.prompt("Describe the issue (20+ characters):");
    if (!description || description.trim().length < 20) return;
    try {
      const demandRefund = window.confirm("Also demand a refund with this dispute?");
      await apiRequest(`/api/commerce/orders/${id}/disputes`, { method: "POST", body: { subject, description, demandRefund } });
      await load();
      setError("Dispute opened. Admin support can now review this order workspace.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not open a dispute.");
    }
  }


  async function closeDispute(disputeId: string) {
    const resolution = window.prompt("Optional closing note:") ?? "Closed by buyer.";
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/close`, { method: "POST", body: { resolution } });
      await load();
      setError("Dispute closed.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not close dispute.");
    }
  }

  async function demandRefund(disputeId: string) {
    const reason = window.prompt("Refund reason:") ?? "Refund demanded from dispute chat.";
    if (reason.trim().length < 10) return;
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/refund`, { method: "POST", body: { reason } });
      await load();
      setError("Refund demand sent to admin.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not demand refund.");
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
            {user?.role === "CUSTOMER" && order.canOpenDispute ? <button className="secondary-button" onClick={() => void openDispute()}><ShieldCheck size={14} /> Open dispute</button> : null}
          </header>
          {order.disputes?.length ? (
            <div className="dispute-alert-card">
              {order.disputes.map((dispute) => (
                <div key={dispute.id}>
                  <strong>{dispute.subject}</strong>
                  <span className={`status-pill ${dispute.status.toLowerCase()}`}>{dispute.status.replaceAll("_", " ")}</span>
                  {dispute.autoCloseAt ? <small>Waiting for {dispute.awaitingParty?.toLowerCase()} · auto-close {new Date(dispute.autoCloseAt).toLocaleString()}</small> : null}
                  {dispute.resolution ? <p>{dispute.resolution}</p> : null}
                  {user?.role === "CUSTOMER" ? <div className="quick-dispute-actions">
                    <button className="secondary-button" onClick={() => void closeDispute(dispute.id)}>Close dispute</button>
                    <button className="secondary-button" disabled={dispute.refundDemanded} onClick={() => void demandRefund(dispute.id)}>{dispute.refundDemanded ? "Refund demanded" : "Demand refund"}</button>
                  </div> : null}
                </div>
              ))}
            </div>
          ) : null}
          {order.items.map((item) => (
            <article className="order-delivery-item" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                {item.product.deliveryNote ? <small>{item.product.deliveryNote}</small> : null}
              </div>
              {item.downloadGrants.length ? (
                <>
                  <a className="action-link" href={`/api/commerce/order-items/${item.id}/download.zip`}><Download size={14} /> Download all as ZIP</a>
                  {item.downloadGrants.map((grant) => (
                    <a key={grant.id} className="action-link" href={`/api/commerce/downloads/${grant.id}`}><Download size={14} /> {grant.productFile.displayName} <small>({grant.maxDownloads - grant.downloadCount} left)</small></a>
                  ))}
                </>
              ) : null}
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
        {messages.length ? messages.map((message) => (
          <article className={message.author.id === user?.id ? "own-message" : ""} key={message.id}>
            <span>{message.author.firstName[0]}</span>
            <div>
              <header><strong>{message.author.firstName}</strong><small>{message.author.role.replace("_", " ")} · {new Date(message.createdAt).toLocaleString()}</small></header>
              <p>{message.body}</p>
              {message.attachmentUrl ? <a className="chat-attachment" href={message.attachmentUrl} target="_blank" rel="noreferrer"><img src={message.attachmentUrl} alt={message.attachmentName ?? "attachment"} /><small>{message.attachmentName ?? "View screenshot"}</small></a> : null}
            </div>
          </article>
        )) : <div className="no-tickets"><MessageCircle /><strong>No messages yet</strong><p>Start the order conversation below.</p></div>}
        <div ref={threadEndRef} />
        <form onSubmit={send}>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Write a message about delivery…" rows={4} />
          <div className="chat-compose-actions">
            <label className="upload-action">Attach screenshot<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /></label>
            {attachment ? <small>{attachment.name}</small> : null}
            <button disabled={sending || !body.trim()}><Send /> {sending ? "Sending…" : "Send message"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
