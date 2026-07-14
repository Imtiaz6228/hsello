import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Headphones, MessageCircle, Plus, Send, X } from "lucide-react";
import { ApiError, apiRequest } from "../api/client";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type TicketMessage = { id: string; body: string; createdAt: string; author?: { firstName: string; role: string } };
type Ticket = { id: string; ticketNumber: string; subject: string; category: string; status: string; updatedAt: string; messages: TicketMessage[] };
const categories = ["PAYMENT_ISSUE", "DOWNLOAD_ISSUE", "REFUND_REQUEST", "PRODUCT_PROBLEM", "SELLER_ISSUE", "TECHNICAL_ISSUE"] as const;

export function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [form, setForm] = useState({ category: "PAYMENT_ISSUE", subject: "", body: "", orderId: "" });
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId), [selectedId, tickets]);

  const load = useCallback(async () => {
    setLoadError("");
    try { const data = await apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets"); setTickets(data.tickets); }
    catch (error) { setLoadError(error instanceof ApiError ? error.message : "Support tickets could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await apiRequest("/api/commerce/tickets", { method: "POST", body: { ...form, orderId: form.orderId || undefined } }); setForm({ category: "PAYMENT_ISSUE", subject: "", body: "", orderId: "" }); setOpen(false); setMessage("Ticket opened. We’ll email you when it changes."); await load(); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not open the ticket."); }
    finally { setBusy(false); }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault(); if (!selected || !reply.trim()) return; setBusy(true); setMessage("");
    try { await apiRequest(`/api/commerce/tickets/${selected.id}/messages`, { method: "POST", body: { body: reply } }); setReply(""); setMessage("Reply sent."); await load(); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Reply could not be sent."); }
    finally { setBusy(false); }
  }

  return <main className="commerce-page"><Seo title="Support center" description="Get help with payments, downloads, refunds, products, sellers, and technical issues." /><MarketHeader />
    <section className="support-hero"><div><span className="section-index">HUMAN SUPPORT</span><h1>We’ll help you untangle it.</h1><p>Order-linked tickets keep the buyer, seller, and support team in one clear record.</p></div><div><Headphones /><strong>Support every day</strong><span>Email notifications on every meaningful update</span></div></section>
    {message ? <div className="support-notice" role="status"><CheckCircle2 /> {message}</div> : null}
    <section className="support-layout"><div><header><div><span className="section-index">YOUR TICKETS</span><h2>Recent conversations</h2></div><button type="button" onClick={() => setOpen(true)}><Plus /> Open ticket</button></header>
      {loading ? <div className="no-tickets" aria-busy="true"><span className="inline-spinner" /><strong>Loading tickets…</strong></div> : loadError ? <div className="status-panel error" role="alert"><strong>Tickets unavailable</strong><span>{loadError}</span><button type="button" onClick={() => void load()}>Try again</button></div> : tickets.length ? <div className="ticket-list">{tickets.map((ticket) => <button type="button" className="ticket-row" key={ticket.id} onClick={() => setSelectedId(ticket.id)}><span className={`ticket-status ${ticket.status.toLowerCase()}`}>{ticket.status}</span><span><strong>{ticket.subject}</strong><small>{ticket.ticketNumber} · {ticket.category.replaceAll("_", " ").toLowerCase()}</small></span><Clock3 /><time>{new Date(ticket.updatedAt).toLocaleDateString()}</time><ArrowRight /></button>)}</div> : <div className="no-tickets"><MessageCircle /><strong>No support tickets</strong><p>If something comes up, open a ticket and keep the full conversation here.</p></div>}
    </div><aside><h2>What we can help with</h2>{categories.map((category) => <span key={category}>{category.replaceAll("_", " ").toLowerCase()}</span>)}</aside></section>
    {open ? <div className="modal-backdrop" role="presentation"><form className="ticket-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"><button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close ticket form"><X /></button><span className="section-index">NEW SUPPORT TICKET</span><h2 id="new-ticket-title">What happened?</h2><label><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></label><label><span>Order ID (optional)</span><input value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} /></label><label><span>Subject</span><input required minLength={5} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label><span>Details</span><textarea required minLength={10} rows={6} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label><button className="primary-button" disabled={busy}><Send /> {busy ? "Opening…" : "Open ticket"}</button></form></div> : null}
    {selected ? <div className="modal-backdrop" role="presentation"><section className="ticket-modal ticket-thread" role="dialog" aria-modal="true" aria-labelledby="ticket-thread-title"><button type="button" className="modal-close" onClick={() => setSelectedId(undefined)} aria-label="Close ticket conversation"><X /></button><span className="section-index">{selected.ticketNumber} · {selected.status}</span><h2 id="ticket-thread-title">{selected.subject}</h2><div className="ticket-messages">{selected.messages.map((entry) => <article key={entry.id}><header><strong>{entry.author?.firstName ?? "Support"}</strong><small>{entry.author?.role?.replaceAll("_", " ").toLowerCase() ?? "support"} · {new Date(entry.createdAt).toLocaleString()}</small></header><p>{entry.body}</p></article>)}</div><form onSubmit={sendReply}><label><span>Your reply</span><textarea required maxLength={4000} rows={4} value={reply} onChange={(event) => setReply(event.target.value)} /></label><button className="primary-button" disabled={busy || !reply.trim()}><Send /> {busy ? "Sending…" : "Send reply"}</button></form></section></div> : null}
    <MarketFooter />
  </main>;
}
