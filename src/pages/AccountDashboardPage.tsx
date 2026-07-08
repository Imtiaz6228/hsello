import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, BarChart3, Download, FileText, Headphones, Home,
  LogOut, MessageCircle, PackageCheck, RefreshCw, Settings, ShieldCheck,
  ShoppingBag, Star, Store, TicketCheck, TrendingUp, UserRound, Activity,
  Wallet, CreditCard, Bitcoin, DollarSign, PlusCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";

type Grant = { id: string; downloadCount: number; maxDownloads: number; expiresAt: string; productFile: { displayName: string; version: number } };
type InventoryItem = { id: string; content: string; source: string; deliveredAt?: string | null };
type Order = { id: string; orderNumber: string; invoiceNumber: string; status: string; totalCents: number; currency: string; createdAt: string; canOpenDispute?: boolean; disputeDeadline?: string; disputeWindowHours?: number; payment?: { method: string; status: string }; items: Array<{ id: string; productName: string; product: { slug: string; type: string; coverImageUrl?: string; afterSalesServiceHours?: number }; downloadGrants: Grant[]; inventoryItems?: InventoryItem[] }>; refunds: Array<{ status: string }>; disputes: Array<{ status: string }> };
type Ticket = { id: string; ticketNumber: string; category: string; status: string; subject: string; updatedAt: string; messages: Array<{ id: string; body: string; author: { firstName: string; role: string } }> };
type Review = { id: string; rating: number; body: string; createdAt: string; product: { name: string; slug: string }; sellerResponse?: string };
type Tab = "overview" | "orders" | "downloads" | "tickets" | "reviews" | "seller" | "wallet" | "profile";

const tabs: Array<{ id: Tab; label: string; icon: typeof Home; roles?: string[] }> = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "tickets", label: "Support", icon: Headphones },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "seller", label: "Seller Hub", icon: Store, roles: ["SELLER"] },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "profile", label: "Profile", icon: UserRound },
];

export function AccountDashboardPage() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerTickets, setSellerTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const downloads = useMemo(() => orders.flatMap((order) => order.items.flatMap((item) => item.downloadGrants.map((grant) => ({ order, item, grant })))), [orders]);
  const totalSpent = useMemo(() => orders.reduce((sum, o) => sum + o.totalCents, 0), [orders]);
  const activeOrders = useMemo(() => orders.filter((o) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)).length, [orders]);

  useEffect(() => {
    void Promise.all([
      apiRequest<{ orders: Order[] }>("/api/commerce/orders").then((d) => setOrders(d.orders)).catch(() => undefined),
      apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets").then((d) => setTickets(d.tickets)).catch(() => undefined),
      apiRequest<{ reviews: Review[] }>("/api/commerce/reviews").then((d) => setReviews(d.reviews)).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "seller" && user?.role === "SELLER") {
      setLoading(true);
      void Promise.all([
        apiRequest<{ items: any[] }>("/api/seller/orders").then((d) => setSellerOrders(d.items)).catch(() => undefined),
        apiRequest<{ products: any[] }>("/api/seller/products").then((d) => setSellerProducts(d.products)).catch(() => undefined),
        apiRequest<{ reviews: any[] }>("/api/seller/reviews").then((d) => setSellerReviews(d.reviews)).catch(() => undefined),
        apiRequest<{ tickets: any[] }>("/api/seller/tickets").then((d) => setSellerTickets(d.tickets)).catch(() => undefined),
        apiRequest<{ profile: any }>("/api/seller/profile").then((d) => setSellerProfile(d.profile)).catch(() => undefined),
      ]).finally(() => setLoading(false));
    }
  }, [tab, user?.role]);

  async function signOut() { await logout(); navigate("/"); }
  async function requestRefund(order: Order) {
    const reason = window.prompt("Tell us what went wrong (at least 20 characters):");
    if (!reason) return;
    try {
      await apiRequest(`/api/commerce/orders/${order.id}/refunds`, { method: "POST", body: { reason } });
      setMessage("Refund request submitted. Support will review the order record.");
      const data = await apiRequest<{ orders: Order[] }>("/api/commerce/orders");
      setOrders(data.orders);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not submit the request.");
    }
  }
  async function openDispute(order: Order) {
    const subject = window.prompt("Dispute subject (5+ characters):");
    if (!subject || subject.trim().length < 5) return;
    const description = window.prompt("Describe the issue (20+ characters):");
    if (!description || description.trim().length < 20) return;
    try {
      await apiRequest(`/api/commerce/orders/${order.id}/disputes`, { method: "POST", body: { subject, description } });
      setMessage("Dispute opened. Admin support can now review the order, chat, and delivery record.");
      const data = await apiRequest<{ orders: Order[] }>("/api/commerce/orders");
      setOrders(data.orders);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not open a dispute.");
    }
  }
  async function createTicket() {
    const subject = window.prompt("Subject (5+ characters):");
    if (!subject || subject.length < 5) return;
    const body = window.prompt("Describe the issue (10+ characters):");
    if (!body || body.length < 10) return;
    try {
      await apiRequest("/api/commerce/tickets", { method: "POST", body: { category: "TECHNICAL_ISSUE", subject, body } });
      setMessage("Support ticket created.");
      const data = await apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets");
      setTickets(data.tickets);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not create ticket.");
    }
  }
  async function replyToTicket(ticketId: string) {
    const body = window.prompt("Your reply:");
    if (!body) return;
    try {
      await apiRequest(`/api/commerce/tickets/${ticketId}/messages`, { method: "POST", body: { body } });
      setMessage("Reply sent.");
      const data = await apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets");
      setTickets(data.tickets);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not send reply.");
    }
  }
  async function submitSellerReply(reviewId: string) {
    const response = window.prompt("Your response (public):");
    if (!response) return;
    try {
      await apiRequest(`/api/seller/reviews/${reviewId}/respond`, { method: "POST", body: { response } });
      setMessage("Review response posted.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not respond.");
    }
  }

  if (!user) return null;

  const sellerRevenue = sellerOrders?.reduce((sum: number, item: any) => {
    if (item.order?.status && !["REFUNDED", "CANCELLED"].includes(item.order.status)) return sum + item.totalCents;
    return sum;
  }, 0) ?? 0;
  const pendingSellerOrders = sellerOrders?.filter((item: any) => ["PROCESSING", "PAID"].includes(item.order?.status)).length ?? 0;

  const visibleTabs = tabs.filter((t) => !t.roles || t.roles.includes(user.role));

  return (
    <main className="account-dashboard-page">
      <Seo title="Account dashboard" description="Manage HSello orders, downloads, invoices, support, and seller activity." />

      <nav className="dashboard-sidebar">
        <Link className="brand-lockup" to="/">
          <span className="brand-glyph">H</span>
          <span><strong>HSELLO</strong><small>ACCOUNT</small></span>
        </Link>
        <div className="sidebar-user">
          <span className="sidebar-avatar">{user.firstName[0]}{user.lastName[0]}</span>
          <div>
            <strong>{user.firstName} {user.lastName}</strong>
            <small>@{user.username}</small>
          </div>
          <span className="role-pill-small"><ShieldCheck size={12} /> {user.role.replace("_", " ")}</span>
        </div>
        <div className="sidebar-nav">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={18} /> {label}
              {id === "orders" && activeOrders > 0 ? <span className="sidebar-badge">{activeOrders}</span> : null}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          {user.role === "SELLER" ? <Link to="/seller" className="secondary-button"><Store size={16} /> Seller studio</Link> : <Link to="/seller/apply" className="secondary-button"><Store size={16} /> Become a seller</Link>}
          {STAFF_ROLES.includes(user.role) ? <Link to="/admin" className="secondary-button"><ShieldCheck size={16} /> Admin</Link> : null}
          <button onClick={() => void signOut()} className="danger-button"><LogOut size={16} /> Sign out</button>
        </div>
      </nav>

      <section className="dashboard-main">
        {message ? <div className="dashboard-message" onClick={() => setMessage("")}>{message} <small>(click to dismiss)</small></div> : null}

        {tab === "overview" && (
          <div className="tab-content overview-tab">
            <header className="tab-header">
              <span className="section-index">DASHBOARD</span>
              <h1>Welcome back, {user.firstName}.</h1>
              <p>Orders, files, support, and seller tools — one place.</p>
            </header>
            <div className="metrics-grid">
              <div className="metric-card"><ShoppingBag size={22} /><span><strong>{orders.length}</strong><small>Total orders</small></span></div>
              <div className="metric-card"><Activity size={22} /><span><strong>{activeOrders}</strong><small>Active orders</small></span></div>
              <div className="metric-card"><Download size={22} /><span><strong>{downloads.length}</strong><small>Available files</small></span></div>
              <div className="metric-card"><TrendingUp size={22} /><span><strong>${(totalSpent / 100).toFixed(2)}</strong><small>Total spent</small></span></div>
              <div className="metric-card"><TicketCheck size={22} /><span><strong>{tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length}</strong><small>Open tickets</small></span></div>
              <div className="metric-card"><Headphones size={22} /><span><strong>Every day</strong><small>Support coverage</small></span></div>
            </div>
            {orders.length > 0 && (
              <div className="recent-section">
                <div className="section-heading-row"><h2>Recent orders</h2><Link to="#orders" onClick={() => setTab("orders")}>View all <ArrowRight size={16} /></Link></div>
                <div className="compact-orders">
                  {orders.slice(0, 3).map((order) => (
                    <div className="compact-order" key={order.id}>
                      <div className="co-left">
                        <span className={`status-dot ${order.status.toLowerCase()}`} />
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <small>{order.items.map((i) => i.productName).join(", ")}</small>
                        </div>
                      </div>
                      <div className="co-right">
                        <span>${(order.totalCents / 100).toFixed(2)}</span>
                        <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {user.role === "SELLER" && (
              <div className="recent-section">
                <div className="section-heading-row"><h2>Seller snapshot</h2><Link to="#seller" onClick={() => setTab("seller")}>Open seller hub <ArrowRight size={16} /></Link></div>
                <div className="quick-seller-stats">
                  <div><Store size={18} /><span><strong>{sellerProfile?.storeName ?? "Store"}</strong><small>{sellerProfile?.isVerified ? "Verified" : "Pending"}</small></span></div>
                  <div><ShoppingBag size={18} /><span><strong>{sellerProducts?.length ?? 0}</strong><small>Products</small></span></div>
                  <div><TrendingUp size={18} /><span><strong>${(sellerRevenue / 100).toFixed(2)}</strong><small>Revenue</small></span></div>
                </div>
              </div>
            )}
            <div className="quick-actions">
              <Link to="/catalog" className="action-card"><PackageCheck size={20} /><span><strong>Browse marketplace</strong><small>Discover new products</small></span><ArrowRight size={16} /></Link>
              <Link to="/support" className="action-card"><Headphones size={20} /><span><strong>Get help</strong><small>Support center & tickets</small></span><ArrowRight size={16} /></Link>
              <Link to="#orders" onClick={() => setTab("orders")} className="action-card"><ShoppingBag size={20} /><span><strong>My orders</strong><small>{orders.length} orders</small></span><ArrowRight size={16} /></Link>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="tab-content orders-tab">
            <header className="tab-header">
              <span className="section-index">ORDERS & DELIVERY</span>
              <h1>Your purchases</h1>
              <p>Downloads, invoices, support, and refunds for every order.</p>
            </header>
            {loading ? <div className="empty-state">Loading orders…</div> : orders.length ? (
              <div className="orders-list">
                {orders.map((order) => (
                  <article className="order-card-full" key={order.id}>
                    <header>
                      <div>
                        <span className={`status-pill ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span>
                        <strong>{order.orderNumber}</strong>
                        <small>{new Date(order.createdAt).toLocaleDateString()} · {order.payment?.method?.replaceAll("_", " ") ?? "Awaiting payment"}</small>
                      </div>
                      <b>${(order.totalCents / 100).toFixed(2)} {order.currency}</b>
                    </header>
                    <div className="order-items">
                      {order.items.map((item) => (
                        <div className="order-item-row" key={item.id}>
                          <div className="oi-info">
                            {item.product.coverImageUrl ? <img src={item.product.coverImageUrl} alt="" className="oi-thumb" /> : <PackageCheck size={20} />}
                            <div>
                              <Link to={`/products/${item.product.slug}`}>{item.productName}</Link>
                              <small>{item.product.type === "SERVICE" ? "Service delivery" : `${item.downloadGrants.length} file${item.downloadGrants.length === 1 ? "" : "s"}`}</small>
                            </div>
                          </div>
                          <div className="oi-actions">
                            {item.product.type === "SERVICE" ? (
                              <Link to={`/orders/${order.id}`} className="action-link"><MessageCircle size={14} /> Delivery chat</Link>
                            ) : (
                              <>
                                {item.downloadGrants.length ? <a href={`/api/commerce/order-items/${item.id}/download.zip`} className="action-link"><Download size={14} /> Download ZIP</a> : null}
                                {item.downloadGrants.map((grant) => (
                                  <a key={grant.id} href={`/api/commerce/downloads/${grant.id}`} className="action-link"><Download size={14} /> {grant.productFile.displayName} <small>({grant.maxDownloads - grant.downloadCount} left)</small></a>
                                ))}
                              </>
                            )}
                          </div>
                          {item.inventoryItems?.length ? (
                            <div className="digital-delivery-rows">
                              {item.inventoryItems.map((row) => <code key={row.id}>{row.content}</code>)}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <footer>
                      <a href={`/api/commerce/orders/${order.id}/invoice`} className="action-link"><FileText size={14} /> Invoice {order.invoiceNumber}</a>
                      <Link to={`/orders/${order.id}`} className="action-link"><MessageCircle size={14} /> Order chat</Link>
                      <button disabled={Boolean(order.refunds.length)} onClick={() => void requestRefund(order)} className="action-link">
                        <RefreshCw size={14} /> {order.refunds.length ? `Refund ${order.refunds[0].status.toLowerCase()}` : "Request refund"}
                      </button>
                      <button disabled={!order.canOpenDispute} onClick={() => void openDispute(order)} className="action-link">
                        <ShieldCheck size={14} /> {order.disputes.length ? `Dispute ${order.disputes[0].status.toLowerCase().replaceAll("_", " ")}` : order.canOpenDispute ? "Open dispute" : `Dispute until ${order.disputeDeadline ? new Date(order.disputeDeadline).toLocaleString() : "after payment"}`}
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <PackageCheck size={48} />
                <h2>No orders yet</h2>
                <p>When you buy something, its invoice, delivery, and support history will live here.</p>
                <Link to="/catalog" className="primary-button">Browse marketplace <ArrowRight size={16} /></Link>
              </div>
            )}
          </div>
        )}

        {tab === "downloads" && (
          <div className="tab-content downloads-tab">
            <header className="tab-header">
              <span className="section-index">DOWNLOAD LIBRARY</span>
              <h1>Your files</h1>
              <p>Access purchased downloads with their remaining limits.</p>
            </header>
            {downloads.length ? (
              <div className="downloads-grid">
                {downloads.map(({ item, grant }) => (
                  <a href={`/api/commerce/downloads/${grant.id}`} className="download-card" key={grant.id}>
                    <div className="dc-icon"><Download size={24} /></div>
                    <div className="dc-info">
                      <strong>{item.productName}</strong>
                      <small>{grant.productFile.displayName} · v{grant.productFile.version}</small>
                      <span className="download-remaining">{grant.maxDownloads - grant.downloadCount} downloads remaining</span>
                      {grant.expiresAt ? <small className="download-expiry">Expires {new Date(grant.expiresAt).toLocaleDateString()}</small> : null}
                    </div>
                    <ArrowRight size={16} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Download size={48} />
                <h2>No files yet</h2>
                <p>Purchased downloads and their latest updates will appear here.</p>
                <Link to="/catalog" className="primary-button">Browse marketplace <ArrowRight size={16} /></Link>
              </div>
            )}
          </div>
        )}

        {tab === "tickets" && (
          <div className="tab-content tickets-tab">
            <header className="tab-header">
              <span className="section-index">SUPPORT CENTER</span>
              <h1>Help & tickets</h1>
              <p>Create tickets, track responses, and get human support.</p>
            </header>
            <button className="primary-button" onClick={() => void createTicket()}><Headphones size={16} /> Create new ticket</button>
            {tickets.length ? (
              <div className="tickets-list">
                {tickets.map((ticket) => (
                  <article className="ticket-card" key={ticket.id}>
                    <header>
                      <div>
                        <span className={`status-pill ${ticket.status.toLowerCase()}`}>{ticket.status.replaceAll("_", " ")}</span>
                        <strong>{ticket.ticketNumber}</strong>
                        <small>{ticket.category.replaceAll("_", " ")} · {new Date(ticket.updatedAt).toLocaleDateString()}</small>
                      </div>
                    </header>
                    <h3>{ticket.subject}</h3>
                    {ticket.messages.length > 0 && (
                      <div className="ticket-messages">
                        {ticket.messages.slice(-2).map((msg) => (
                          <div className="ticket-msg" key={msg.id}>
                            <strong>{msg.author?.firstName ?? "You"}</strong>
                            <p>{msg.body.length > 200 ? msg.body.slice(0, 200) + "…" : msg.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <footer>
                      <button onClick={() => void replyToTicket(ticket.id)} className="action-link"><MessageCircle size={14} /> Reply</button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Headphones size={48} />
                <h2>No tickets yet</h2>
                <p>Support requests, refund inquiries, and technical help will appear here.</p>
              </div>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="tab-content reviews-tab">
            <header className="tab-header">
              <span className="section-index">YOUR REVIEWS</span>
              <h1>Product reviews</h1>
              <p>Reviews you've written for purchased products.</p>
            </header>
            {reviews.length ? (
              <div className="reviews-grid">
                {reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />)}</div>
                    <p>{review.body}</p>
                    <div className="review-meta">
                      <Link to={`/products/${review.product.slug}`}><strong>{review.product.name}</strong></Link>
                      <small>{new Date(review.createdAt).toLocaleDateString()}</small>
                    </div>
                    {review.sellerResponse ? <div className="seller-response"><strong>Seller response:</strong> {review.sellerResponse}</div> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Star size={48} />
                <h2>No reviews yet</h2>
                <p>After purchasing and using a product, leave a review to help other buyers.</p>
              </div>
            )}
          </div>
        )}

        {tab === "seller" && user.role === "SELLER" && (
          <div className="tab-content seller-tab">
            <header className="tab-header">
              <span className="section-index">SELLER HUB</span>
              <h1>{sellerProfile?.storeName ?? "Your store"}</h1>
              <p>{sellerProfile?.isVerified ? "Verified store · Active" : "Pending verification"}</p>
            </header>
            <div className="seller-hub-metrics">
              <div className="metric-card"><ShoppingBag size={22} /><span><strong>{sellerOrders?.length ?? 0}</strong><small>Orders received</small></span></div>
              <div className="metric-card"><TrendingUp size={22} /><span><strong>${(sellerRevenue / 100).toFixed(2)}</strong><small>Total revenue</small></span></div>
              <div className="metric-card"><PackageCheck size={22} /><span><strong>{sellerProducts?.length ?? 0}</strong><small>Products listed</small></span></div>
              <div className="metric-card"><Activity size={22} /><span><strong>{pendingSellerOrders}</strong><small>Pending orders</small></span></div>
            </div>

            {sellerOrders?.length > 0 && (
              <div className="section-block">
                <h2>Recent orders <small>({sellerOrders.length} total)</small></h2>
                <div className="compact-orders">
                  {sellerOrders.slice(0, 5).map((item: any) => (
                    <div className="compact-order" key={item.id}>
                      <div className="co-left"><PackageCheck size={16} /><div><strong>{item.productName}</strong><small>Order {item.order?.orderNumber} · {item.order?.buyer?.firstName}</small></div></div>
                      <div className="co-right"><span>${(item.totalCents / 100).toFixed(2)}</span><small className={`status-pill ${item.order?.status?.toLowerCase()}`}>{item.order?.status?.replaceAll("_", " ")}</small></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerProducts?.length > 0 && (
              <div className="section-block">
                <h2>Your products <small>({sellerProducts.length} total)</small></h2>
                <div className="seller-product-grid">
                  {sellerProducts.map((product) => (
                    <div className="sp-card" key={product.id}>
                      <span className={`sp-status ${product.status.toLowerCase()}`}>{product.status}</span>
                      <strong>{product.name}</strong>
                      <small>{product.type} · ${(product.priceCents / 100).toFixed(2)}</small>
                      <span className="sp-files">{product.files?.length ?? 0} file{(product.files?.length ?? 0) !== 1 ? "s" : ""}</span>
                      <small>{product.category?.parent?.name ? `${product.category.parent.name} / ` : ""}{product.category?.name ?? "Uncategorized"}</small>
                      <Link to="/seller" className="action-link">Manage product</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerReviews?.length > 0 && (
              <div className="section-block">
                <h2>Recent reviews <small>({sellerReviews.length} total)</small></h2>
                <div className="compact-orders">
                  {sellerReviews.slice(0, 3).map((review: any) => (
                    <div className="compact-order" key={review.id}>
                      <div className="co-left">
                        <div className="review-stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />)}</div>
                        <div><strong>{review.product?.name}</strong><small>by {review.buyer?.firstName}</small></div>
                      </div>
                      <div className="co-right">
                        {review.sellerResponse ? <small className="status-pill">Replied</small> : <button onClick={() => void submitSellerReply(review.id)} className="action-link">Reply</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerTickets?.length > 0 && (
              <div className="section-block">
                <h2>Support tickets <small>({sellerTickets.length} open)</small></h2>
                <div className="compact-orders">
                  {sellerTickets.slice(0, 3).map((ticket: any) => (
                    <div className="compact-order" key={ticket.id}>
                      <div className="co-left"><Headphones size={16} /><div><strong>{ticket.subject}</strong><small>{ticket.ticketNumber} · {ticket.creator?.email}</small></div></div>
                      <div className="co-right"><span className={`status-pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!sellerOrders?.length && !sellerProducts?.length ? (
              <div className="empty-state-large">
                <Store size={48} />
                <h2>Start selling</h2>
                <p>Head to your Seller Studio to create product drafts and submit them for review.</p>
                <Link to="/seller" className="primary-button">Open seller studio <ArrowRight size={16} /></Link>
              </div>
            ) : null}
          </div>
        )}

        {tab === "wallet" && (
          <WalletTabContent user={user} setMessage={setMessage} />
        )}

        {tab === "profile" && (
          <div className="tab-content profile-tab">
            <header className="tab-header">
              <span className="section-index">PROFILE</span>
              <h1>Account details</h1>
              <p>Your identity, role, and contact information.</p>
            </header>
            <div className="profile-card">
              <div className="profile-avatar-large">{user.firstName[0]}{user.lastName[0]}</div>
              <div className="profile-details">
                <div className="profile-row"><label>Full name</label><span>{user.firstName} {user.lastName}</span></div>
                <div className="profile-row"><label>Username</label><span>@{user.username}</span></div>
                <div className="profile-row"><label>Email</label><span>{user.email} {user.emailVerified ? <BadgeCheck size={14} /> : null}</span></div>
                <div className="profile-row"><label>Phone</label><span>{user.phone || "—"}</span></div>
                <div className="profile-row"><label>Country</label><span>{user.country || "—"}</span></div>
                <div className="profile-row"><label>City</label><span>{user.city || "—"}</span></div>
                <div className="profile-row"><label>Role</label><span className="role-pill"><ShieldCheck size={12} /> {user.role.replace("_", " ")}</span></div>
                <div className="profile-row"><label>Member since</label><span>{new Date(user.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

type Deposit = { id: string; amountCents: number; method: string; status: string; providerReference?: string; createdAt: string };

function WalletTabContent({ user, setMessage }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; setMessage: (m: string) => void }) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balance, setBalance] = useState(user.balanceCents ?? 0);
  const [busy, setBusy] = useState(false);
  const [depositMethod, setDepositMethod] = useState("CARD");
  const [depositAmount, setDepositAmount] = useState("");

  useEffect(() => {
    void apiRequest<{ balanceCents: number }>("/api/wallet/balance")
      .then((d) => setBalance(d.balanceCents))
      .catch(() => undefined);
    void apiRequest<{ deposits: Deposit[] }>("/api/wallet/deposits")
      .then((d) => setDeposits(d.deposits))
      .catch(() => undefined);
  }, []);

  async function submitDeposit() {
    const cents = Math.round(parseFloat(depositAmount) * 100);
    if (!cents || cents < 100 || cents > 500000) {
      setMessage("Enter an amount between $1.00 and $5,000.00.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ message: string }>("/api/wallet/deposit", {
        method: "POST",
        body: { amountCents: cents, method: depositMethod }
      });
      setMessage(data.message);
      setDepositAmount("");
      const [b, d] = await Promise.all([
        apiRequest<{ balanceCents: number }>("/api/wallet/balance"),
        apiRequest<{ deposits: Deposit[] }>("/api/wallet/deposits")
      ]);
      setBalance(b.balanceCents);
      setDeposits(d.deposits);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Deposit failed.");
    } finally {
      setBusy(false);
    }
  }

  const methods = [
    { value: "CARD", label: "Credit / Debit Card", icon: CreditCard },
    { value: "CRYPTO", label: "Cryptocurrency", icon: Bitcoin },
    { value: "PAYPAL", label: "PayPal", icon: DollarSign },
  ];

  return (
    <div className="tab-content wallet-tab">
      <header className="tab-header">
        <span className="section-index">WALLET</span>
        <h1>Your balance</h1>
        <p>Deposit with card, crypto, or PayPal. Admin reviews and approves deposits to your balance.</p>
      </header>

      <div className="wallet-balance-banner">
        <Wallet size={32} />
        <div>
          <strong>${(balance / 100).toFixed(2)}</strong>
          <small>Available balance</small>
        </div>
      </div>

      <div className="wallet-deposit-form">
        <h2>Add funds</h2>
        <div className="deposit-method-tabs">
          {methods.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                className={depositMethod === m.value ? "active" : ""}
                onClick={() => setDepositMethod(m.value)}
              >
                <Icon size={16} /> {m.label}
              </button>
            );
          })}
        </div>
        <div className="deposit-input-row">
          <div className="field">
            <span>Amount (USD)</span>
            <input
              type="number"
              min="1"
              max="5000"
              step="0.01"
              placeholder="50.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
          <button className="primary-button" disabled={busy} onClick={() => void submitDeposit()}>
            <PlusCircle size={16} /> {busy ? "Submitting…" : "Deposit"}
          </button>
        </div>
      </div>

      {deposits.length > 0 && (
        <div className="section-block">
          <h2>Deposit history <small>({deposits.length} total)</small></h2>
          <div className="compact-orders">
            {deposits.map((deposit) => (
              <div className="compact-order" key={deposit.id}>
                <div className="co-left">
                  {deposit.method === "CRYPTO" ? <Bitcoin size={16} /> : deposit.method === "PAYPAL" ? <DollarSign size={16} /> : <CreditCard size={16} />}
                  <div>
                    <strong>${(deposit.amountCents / 100).toFixed(2)}</strong>
                    <small>{deposit.method === "CRYPTO" ? "Crypto" : deposit.method === "PAYPAL" ? "PayPal" : "Card"} · {deposit.providerReference}</small>
                  </div>
                </div>
                <div className="co-right">
                  <span className={`status-pill ${deposit.status.toLowerCase()}`}>{deposit.status}</span>
                  <small>{new Date(deposit.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!deposits.length && (
        <div className="empty-state-large">
          <Bitcoin size={48} />
          <h2>No deposits yet</h2>
          <p>Add funds with crypto, card, or PayPal. Deposits are reviewed by admin before being added to your balance.</p>
        </div>
      )}
    </div>
  );
}
