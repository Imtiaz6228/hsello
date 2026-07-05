import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type Message = { id: string; body: string; createdAt: string; author: { firstName: string; role: string } };
export function OrderDeliveryPage() {
  const { id } = useParams(); const [messages, setMessages] = useState<Message[]>([]); const [body, setBody] = useState(""); const [error, setError] = useState("");
  const load = () => apiRequest<{ messages: Message[] }>(`/api/commerce/orders/${id}/messages`).then((data) => setMessages(data.messages)).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load the order."));
  useEffect(() => { void load(); }, [id]);
  async function send(event: FormEvent) { event.preventDefault(); if (!body.trim()) return; try { await apiRequest(`/api/commerce/orders/${id}/messages`, { method: "POST", body: { body } }); setBody(""); await load(); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Message could not be sent."); } }
  return <main className="commerce-page order-workspace"><Seo title="Order delivery workspace" description="Protected buyer and seller messages for a HSello order." /><MarketHeader /><section><Link className="back-link" to="/dashboard"><ArrowLeft /> Back to dashboard</Link><span className="section-index">PROTECTED ORDER WORKSPACE</span><h1>Delivery & messages</h1><p><ShieldCheck /> Keep delivery and decisions here so support can help if needed.</p></section><div className="order-chat">{error ? <div className="notice error">{error}</div> : null}{messages.length ? messages.map((message) => <article key={message.id}><span>{message.author.firstName[0]}</span><div><header><strong>{message.author.firstName}</strong><small>{message.author.role.replace("_", " ")} · {new Date(message.createdAt).toLocaleString()}</small></header><p>{message.body}</p></div></article>) : <div className="no-tickets"><MessageCircle /><strong>No messages yet</strong><p>Start the order conversation below.</p></div>}<form onSubmit={send}><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message about delivery…" rows={4} /><button><Send /> Send message</button></form></div></main>;
}
