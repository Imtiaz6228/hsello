import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, BarChart3, Download, FileText, Headphones, Home,
  LogOut, MessageCircle, PackageCheck, RefreshCw, Settings, ShieldCheck,
  ShoppingBag, Star, Store, TicketCheck, TrendingUp, UserRound, Activity,
  Wallet, CreditCard, Bitcoin, DollarSign, PlusCircle, Gavel, MessageSquare,
  LockKeyhole, Bell, Search, ChevronDown, Landmark, Smartphone, ClipboardCopy,
  UploadCloud, CheckCircle2, Clock3, ShieldAlert
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { ApiError, apiRequest, STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";
import { EarningsChart } from "../components/EarningsChart";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

type Grant = { id: string; downloadCount: number; maxDownloads: number; expiresAt: string; productFile: { displayName: string; version: number } };
type InventoryItem = { id: string; content: string; source: string; deliveredAt?: string | null };
type Order = { id: string; orderNumber: string; invoiceNumber: string; status: string; totalCents: number; currency: string; createdAt: string; canOpenDispute?: boolean; disputeDeadline?: string; disputeWindowHours?: number; payment?: { method: string; status: string }; items: Array<{ id: string; productName: string; product: { slug: string; type: string; coverImageUrl?: string; afterSalesServiceHours?: number }; downloadGrants: Grant[]; inventoryItems?: InventoryItem[] }>; refunds: Array<{ status: string }>; disputes: Array<{ id?: string; status: string; subject?: string; refundDemanded?: boolean }> };

type Chat = { id: string; orderNumber: string; status: string; updatedAt: string; items: Array<{ productName: string; product?: { slug?: string; coverImageUrl?: string | null } }>; messages: Array<{ id: string; body: string; createdAt: string; author: { firstName: string; role: string } }>; disputes: Array<{ status: string }> };
type Dispute = { id: string; status: string; subject: string; description: string; refundDemanded?: boolean; awaitingParty?: string | null; autoCloseAt?: string | null; closedInFavorOf?: string | null; resolution?: string | null; createdAt: string; order: { id: string; orderNumber: string; items: Array<{ productName: string; product?: { name?: string; slug?: string; coverImageUrl?: string | null } }> }; orderItem?: { product?: { name?: string; slug?: string; coverImageUrl?: string | null } } | null };
type SellerFinance = { availableBalanceCents: number; frozenBalanceCents: number; totalSellerEarningsCents: number; withdrawnCents: number; todayIncomeCents: number; todayOrderCount: number };
type Ticket = { id: string; ticketNumber: string; category: string; status: string; subject: string; updatedAt: string; messages: Array<{ id: string; body: string; author: { firstName: string; role: string } }> };
type Review = { id: string; rating: number; body: string; createdAt: string; product: { name: string; slug: string }; sellerResponse?: string };
type Tab = "overview" | "orders" | "downloads" | "chats" | "disputes" | "tickets" | "reviews" | "seller" | "wallet" | "profile";

const tabs: Array<{ id: Tab; label: string; icon: typeof Home; roles?: string[] }> = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "disputes", label: "Disputes", icon: Gavel },
  { id: "tickets", label: "Support", icon: Headphones },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "seller", label: "Seller Hub", icon: Store, roles: ["SELLER"] },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "profile", label: "Profile", icon: UserRound },
];

function roleDashboardRedirect(role: string) {
  if (STAFF_ROLES.some((staffRole) => staffRole === role)) return "/admin";
  if (role === "SELLER") return "/seller";
  return null;
}

export function AccountDashboardPage() {
  const { user } = useAuth();
  const { formatMoney } = useLocale();
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    return tabs.some((item) => item.id === hash) ? hash : "overview";
  });
  function selectTab(next: Tab) {
    setTabState(next);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
  }
  useEffect(() => {
    const syncTab = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (tabs.some((item) => item.id === hash)) setTabState(hash);
    };
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerTickets, setSellerTickets] = useState<any[]>([]);
  const [sellerDisputes, setSellerDisputes] = useState<any[]>([]);
  const [sellerFinance, setSellerFinance] = useState<SellerFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState(user?.balanceCents ?? 0);

  const downloads = useMemo(() => orders.flatMap((order) => order.items.flatMap((item) => item.downloadGrants.map((grant) => ({ order, item, grant })))), [orders]);
  const totalSpent = useMemo(() => orders.reduce((sum, o) => sum + o.totalCents, 0), [orders]);
  const activeOrders = useMemo(() => orders.filter((o) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)).length, [orders]);

  useEffect(() => {
    void Promise.all([
      apiRequest<{ orders: Order[] }>("/api/commerce/orders").then((d) => setOrders(d.orders)).catch(() => undefined),
      apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets").then((d) => setTickets(d.tickets)).catch(() => undefined),
      apiRequest<{ reviews: Review[] }>("/api/commerce/reviews").then((d) => setReviews(d.reviews)).catch(() => undefined),
      apiRequest<{ chats: Chat[] }>("/api/commerce/chats").then((d) => setChats(d.chats)).catch(() => undefined),
      apiRequest<{ disputes: Dispute[] }>("/api/commerce/disputes").then((d) => setDisputes(d.disputes)).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setWalletBalance(user.balanceCents ?? 0);
    void apiRequest<{ balanceCents: number; availableBalanceCents?: number }>("/api/wallet/balance")
      .then((data) => setWalletBalance(data.availableBalanceCents ?? data.balanceCents))
      .catch(() => undefined);
  }, [user?.id, user?.balanceCents]);

  useEffect(() => {
    if (tab === "seller" && user?.role === "SELLER") {
      setLoading(true);
      void Promise.all([
        apiRequest<{ items: any[] }>("/api/seller/orders").then((d) => setSellerOrders(d.items)).catch(() => undefined),
        apiRequest<{ products: any[] }>("/api/seller/products").then((d) => setSellerProducts(d.products)).catch(() => undefined),
        apiRequest<{ reviews: any[] }>("/api/seller/reviews").then((d) => setSellerReviews(d.reviews)).catch(() => undefined),
        apiRequest<{ tickets: any[] }>("/api/seller/tickets").then((d) => setSellerTickets(d.tickets)).catch(() => undefined),
        apiRequest<{ profile: any }>("/api/seller/profile").then((d) => setSellerProfile(d.profile)).catch(() => undefined),
        apiRequest<{ disputes: any[] }>("/api/seller/disputes").then((d) => setSellerDisputes(d.disputes)).catch(() => undefined),
        apiRequest<{ summary: SellerFinance }>("/api/seller/finance").then((d) => setSellerFinance(d.summary)).catch(() => undefined),
      ]).finally(() => setLoading(false));
    }
  }, [tab, user?.role]);

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
      const demandRefund = window.confirm("Also demand a refund with this dispute?");
      await apiRequest(`/api/commerce/orders/${order.id}/disputes`, { method: "POST", body: { subject, description, demandRefund } });
      setMessage("Dispute opened. Admin support can now review the order, chat, and delivery record.");
      const data = await apiRequest<{ orders: Order[] }>("/api/commerce/orders");
      setOrders(data.orders);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not open a dispute.");
    }
  }
  async function closeDispute(disputeId: string) {
    const resolution = window.prompt("Optional closing note:") ?? "Closed by buyer.";
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/close`, { method: "POST", body: { resolution } });
      setMessage("Dispute closed.");
      const data = await apiRequest<{ disputes: Dispute[] }>("/api/commerce/disputes");
      setDisputes(data.disputes);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not close dispute.");
    }
  }

  async function demandDisputeRefund(disputeId: string) {
    const reason = window.prompt("Refund demand reason:") ?? "Refund demanded from dispute.";
    if (reason.trim().length < 10) return;
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/refund`, { method: "POST", body: { reason } });
      setMessage("Refund demand sent to admin.");
      const data = await apiRequest<{ disputes: Dispute[] }>("/api/commerce/disputes");
      setDisputes(data.disputes);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not demand refund.");
    }
  }

  async function sellerRefund(orderId: string, amountCents: number) {
    const reason = window.prompt("Refund reason to admin:") ?? "Seller requested refund.";
    if (reason.trim().length < 10) return;
    try {
      await apiRequest(`/api/seller/orders/${orderId}/refund`, { method: "POST", body: { reason, amountCents } });
      setMessage("Seller refund request sent to admin.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not request seller refund.");
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
  const redirectPath = roleDashboardRedirect(user.role);
  if (redirectPath) return <Navigate to={redirectPath} replace />;

  const sellerRevenue = sellerFinance?.totalSellerEarningsCents ?? sellerOrders?.reduce((sum: number, item: any) => {
    if (item.order?.status && !["REFUNDED", "CANCELLED"].includes(item.order.status)) return sum + item.totalCents;
    return sum;
  }, 0) ?? 0;
  const pendingSellerOrders = sellerOrders?.filter((item: any) => ["PROCESSING", "PAID", "DISPUTED"].includes(item.order?.status)).length ?? 0;

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
            <button key={id} className={tab === id ? "active" : ""} onClick={() => selectTab(id)}>
              <Icon size={18} /> {label}
              {id === "orders" && activeOrders > 0 ? <span className="sidebar-badge">{activeOrders}</span> : null}
              {id === "disputes" && disputes.filter((d) => !["CLOSED", "RESOLVED_BUYER", "RESOLVED_SELLER"].includes(d.status)).length > 0 ? <span className="sidebar-badge">{disputes.filter((d) => !["CLOSED", "RESOLVED_BUYER", "RESOLVED_SELLER"].includes(d.status)).length}</span> : null}
              {id === "chats" && chats.length > 0 ? <span className="sidebar-badge">{chats.length}</span> : null}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          {user.role === "SELLER" ? <Link to="/seller" className="secondary-button"><Store size={16} /> Seller studio</Link> : <Link to="/seller/apply" className="secondary-button"><Store size={16} /> Become a seller</Link>}
          {STAFF_ROLES.includes(user.role) ? <Link to="/admin" className="secondary-button"><ShieldCheck size={16} /> Admin</Link> : null}
          <Link to="/sign-out" className="danger-button"><LogOut size={16} /> Sign out</Link>
        </div>
      </nav>

      <section className="dashboard-main">
        <div className="dashboard-command-bar">
          <label><Search size={16} /><input aria-label="Search dashboard" placeholder="Search orders, products, disputes…" /></label>
          <div>
            <LocaleSwitcher />
            <button className="command-icon" aria-label="Notifications"><Bell size={18} /><span /></button>
            <Link className="account-switcher" to="/sign-out" title="Open sign-out page"><span>{user.firstName[0]}{user.lastName[0]}</span><b>{user.firstName}</b><LogOut size={15} /></Link>
          </div>
        </div>
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
              <div className="metric-card"><TrendingUp size={22} /><span><strong>{formatMoney(totalSpent)}</strong><small>Total spent</small></span></div>
              <div className="metric-card"><Wallet size={22} /><span><strong>{formatMoney(walletBalance)}</strong><small>Available balance</small></span></div>
              <div className="metric-card"><TicketCheck size={22} /><span><strong>{tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length}</strong><small>Open tickets</small></span></div>
              <div className="metric-card"><Headphones size={22} /><span><strong>Every day</strong><small>Support coverage</small></span></div>
            </div>
            {orders.length > 0 && (
              <div className="recent-section">
                <div className="section-heading-row"><h2>Recent orders</h2><Link to="#orders" onClick={() => selectTab("orders")}>View all <ArrowRight size={16} /></Link></div>
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
                        <span>{formatMoney(order.totalCents)}</span>
                        <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {user.role === "SELLER" && (
              <div className="recent-section">
                <div className="section-heading-row"><h2>Seller snapshot</h2><Link to="#seller" onClick={() => selectTab("seller")}>Open seller hub <ArrowRight size={16} /></Link></div>
                <div className="quick-seller-stats">
                  <div><Store size={18} /><span><strong>{sellerProfile?.storeName ?? "Store"}</strong><small>{sellerProfile?.isVerified ? "Verified" : "Pending"}</small></span></div>
                  <div><ShoppingBag size={18} /><span><strong>{sellerProducts?.length ?? 0}</strong><small>Products</small></span></div>
                  <div><TrendingUp size={18} /><span><strong>{formatMoney(sellerRevenue)}</strong><small>Revenue</small></span></div>
                </div>
              </div>
            )}
            <div className="quick-actions">
              <Link to="/catalog" className="action-card"><PackageCheck size={20} /><span><strong>Browse marketplace</strong><small>Discover new products</small></span><ArrowRight size={16} /></Link>
              <Link to="/support" className="action-card"><Headphones size={20} /><span><strong>Get help</strong><small>Support center & tickets</small></span><ArrowRight size={16} /></Link>
              <Link to="#orders" onClick={() => selectTab("orders")} className="action-card"><ShoppingBag size={20} /><span><strong>My orders</strong><small>{orders.length} orders</small></span><ArrowRight size={16} /></Link>
              <Link to="#chats" onClick={() => selectTab("chats")} className="action-card"><MessageSquare size={20} /><span><strong>Order chats</strong><small>{chats.length} conversations</small></span><ArrowRight size={16} /></Link>
              <Link to="#disputes" onClick={() => selectTab("disputes")} className="action-card"><Gavel size={20} /><span><strong>Disputes</strong><small>{disputes.length} cases</small></span><ArrowRight size={16} /></Link>
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
                      <b>{formatMoney(order.totalCents)}</b>
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

        {tab === "chats" && (
          <div className="tab-content chats-tab">
            <header className="tab-header">
              <span className="section-index">ORDER CHATS</span>
              <h1>Buyer / seller conversations</h1>
              <p>Every post-order chat appears here. Open the workspace to send messages or screenshots.</p>
            </header>
            {chats.length ? (
              <div className="compact-orders">
                {chats.map((chat) => (
                  <Link className="compact-order chat-list-item" to={`/orders/${chat.id}`} key={chat.id}>
                    <div className="co-left">
                      <MessageSquare size={16} />
                      <div>
                        <strong>{chat.orderNumber}</strong>
                        <small>{chat.items.map((item) => item.productName).join(", ")}</small>
                        {chat.messages[0] ? <small>{chat.messages[0].author.firstName}: {chat.messages[0].body.slice(0, 90)}{chat.messages[0].body.length > 90 ? "…" : ""}</small> : null}
                      </div>
                    </div>
                    <div className="co-right"><span className={`status-pill ${chat.status.toLowerCase()}`}>{chat.status.replaceAll("_", " ")}</span><small>{new Date(chat.updatedAt).toLocaleDateString()}</small></div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state-large"><MessageSquare size={48} /><h2>No chats yet</h2><p>Open an order and message the seller to start a conversation.</p></div>
            )}
          </div>
        )}

        {tab === "disputes" && (
          <div className="tab-content disputes-tab">
            <header className="tab-header">
              <span className="section-index">DISPUTES</span>
              <h1>Open disputes and refund demands</h1>
              <p>If one party does not reply within 24 hours, the dispute is automatically closed against that party.</p>
            </header>
            {disputes.length ? (
              <div className="orders-list dispute-list">
                {disputes.map((dispute) => (
                  <article className="order-card-full dispute-card" key={dispute.id}>
                    <header>
                      <div>
                        <span className={`status-pill ${dispute.status.toLowerCase()}`}>{dispute.status.replaceAll("_", " ")}</span>
                        <strong>{dispute.subject}</strong>
                        <small>Order {dispute.order.orderNumber} · {new Date(dispute.createdAt).toLocaleString()}</small>
                      </div>
                      {dispute.closedInFavorOf ? <b>Favored {dispute.closedInFavorOf.toLowerCase()}</b> : dispute.autoCloseAt ? <b>Due {new Date(dispute.autoCloseAt).toLocaleString()}</b> : null}
                    </header>
                    <p>{dispute.description}</p>
                    {dispute.resolution ? <div className="notice success">{dispute.resolution}</div> : null}
                    <footer>
                      <Link to={`/orders/${dispute.order.id}`} className="action-link"><MessageCircle size={14} /> Open chat</Link>
                      <button className="action-link" onClick={() => void closeDispute(dispute.id)}><ShieldCheck size={14} /> Close dispute</button>
                      <button className="action-link" disabled={dispute.refundDemanded} onClick={() => void demandDisputeRefund(dispute.id)}><RefreshCw size={14} /> {dispute.refundDemanded ? "Refund demanded" : "Demand refund"}</button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large"><Gavel size={48} /><h2>No disputes</h2><p>Open a dispute from any paid order during its after-sales window.</p></div>
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
            <div className="seller-center-hero">
              <div>
                <span className="section-index">REAL TIME DATA</span>
                <h2>Seller Center</h2>
                <p>Quickly view your balance, frozen revenue, products, disputes, orders, and sales.</p>
              </div>
              <button className="secondary-button" onClick={() => void Promise.all([apiRequest<{ items: any[] }>("/api/seller/orders").then((d) => setSellerOrders(d.items)), apiRequest<{ disputes: any[] }>("/api/seller/disputes").then((d) => setSellerDisputes(d.disputes)), apiRequest<{ summary: SellerFinance }>("/api/seller/finance").then((d) => setSellerFinance(d.summary))])}><RefreshCw size={16} /> Refresh</button>
            </div>
            <div className="seller-hub-metrics seller-center-grid">
              <div className="metric-card"><Wallet size={22} /><span><small>Seller balance</small><strong>{formatMoney(sellerFinance?.availableBalanceCents ?? walletBalance)}</strong><small><LockKeyhole size={12} /> frozen: {formatMoney(sellerFinance?.frozenBalanceCents ?? 0)}</small></span></div>
              <div className="metric-card"><PackageCheck size={22} /><span><small>Product</small><strong>{sellerProducts?.length ?? 0}</strong><small>{sellerProducts.filter((p: any) => p.status === "APPROVED").length} approved · {sellerProducts.filter((p: any) => p.status === "PENDING").length} pending</small></span></div>
              <div className="metric-card"><ShoppingBag size={22} /><span><small>Total order</small><strong>{sellerOrders?.length ?? 0}</strong><small>{sellerOrders.filter((item: any) => item.order?.payment?.status === "PAID").length} paid</small></span></div>
              <div className="metric-card"><TrendingUp size={22} /><span><small>Total sales</small><strong>{formatMoney(sellerRevenue)}</strong><small>Withdrawn: {formatMoney(sellerFinance?.withdrawnCents ?? 0)}</small></span></div>
              <div className="metric-card"><Activity size={22} /><span><small>Today</small><strong>{sellerFinance?.todayOrderCount ?? 0}</strong><small>orders</small></span></div>
              <div className="metric-card"><DollarSign size={22} /><span><small>Income today</small><strong>{formatMoney(sellerFinance?.todayIncomeCents ?? 0)}</strong><small>3-day hold applies</small></span></div>
              <div className="metric-card"><Gavel size={22} /><span><small>Disputes</small><strong>{sellerDisputes.filter((d: any) => !["CLOSED", "RESOLVED_BUYER", "RESOLVED_SELLER"].includes(d.status)).length}</strong><small>{sellerDisputes.length} total</small></span></div>
              <div className="metric-card"><Activity size={22} /><span><small>Pending orders</small><strong>{pendingSellerOrders}</strong><small>processing/disputed</small></span></div>
            </div>

            <div className="seller-analytics-grid">
              <section className="seller-sales-chart">
                <header><div><span className="section-index">SALES STATISTICS</span><h2>Revenue performance</h2></div><select aria-label="Analytics period"><option>Last 15 days</option><option>Last 30 days</option><option>Last 90 days</option></select></header>
                <div className="chart-summary"><span><small>Net income</small><strong>{formatMoney(sellerRevenue)}</strong></span><span><small>Average order</small><strong>{formatMoney(sellerOrders.length ? sellerRevenue / sellerOrders.length : 0)}</strong></span><span><small>Refund risk</small><strong className="risk-value">{sellerDisputes.length}</strong></span></div>
                <div className="chart-frame"><EarningsChart label="Seller revenue" color="#635bff" points={[18,34,28,47,42,65,51,78,72,96,69,111,86,124,103].map((value, index) => ({ label: `Day ${index + 1}`, value: Math.round(value * Math.max(1, sellerRevenue / 920)) }))} /></div>
              </section>
              <aside className="seller-todo-panel"><span className="section-index">TO-DO & WARNINGS</span><h2>Store health</h2><div><span className="todo-dot danger" /><p><strong>{sellerProducts.filter((p: any) => p.status === "REJECTED").length} listings need attention</strong><small>Review rejected products and resubmit.</small></p></div><div><span className="todo-dot warning" /><p><strong>{sellerProducts.filter((p: any) => p.inventoryItems?.filter((i: any) => i.isActive && !i.deliveredAt).length === 0).length} products low on stock</strong><small>Add delivery inventory before the next sale.</small></p></div><div><span className="todo-dot success" /><p><strong>Payments protected</strong><small>Seller earnings follow the configured hold period.</small></p></div></aside>
            </div>

            {sellerOrders?.length > 0 && (
              <div className="section-block">
                <h2>Recent orders <small>({sellerOrders.length} total)</small></h2>
                <div className="compact-orders">
                  {sellerOrders.slice(0, 6).map((item: any) => (
                    <div className="compact-order seller-order-row" key={item.id}>
                      <div className="co-left">
                        <PackageCheck size={16} />
                        <div>
                          <strong>{item.productName}</strong>
                          <small>Order {item.order?.orderNumber} · buyer {item.order?.buyer?.firstName ?? "customer"}</small>
                          {item.order?.messages?.[0] ? <small>Last chat: {item.order.messages[0].body.slice(0, 80)}{item.order.messages[0].body.length > 80 ? "…" : ""}</small> : null}
                          {item.sellerEarning ? <small>{item.sellerEarning.status} · releases {new Date(item.sellerEarning.availableAt).toLocaleDateString()}</small> : null}
                        </div>
                      </div>
                      <div className="co-right">
                        <span>{formatMoney(item.totalCents)}</span>
                        <small className={`status-pill ${item.order?.status?.toLowerCase()}`}>{item.order?.status?.replaceAll("_", " ")}</small>
                        <div className="seller-row-actions">
                          <Link to={`/orders/${item.order?.id}`} className="action-link"><MessageCircle size={14} /> Chat</Link>
                          <button className="action-link" onClick={() => void sellerRefund(item.order?.id, item.totalCents)}><RefreshCw size={14} /> Refund</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerDisputes?.length > 0 && (
              <div className="section-block seller-dispute-section">
                <h2>Disputes <small>({sellerDisputes.length} total)</small></h2>
                <div className="orders-list dispute-list">
                  {sellerDisputes.slice(0, 6).map((dispute: any) => (
                    <article className="order-card-full dispute-card" key={dispute.id}>
                      <header>
                        <div>
                          <span className={`status-pill ${dispute.status.toLowerCase()}`}>{dispute.status.replaceAll("_", " ")}</span>
                          <strong>{dispute.subject}</strong>
                          <small>Order {dispute.order?.orderNumber} · buyer {dispute.order?.buyer?.email}</small>
                        </div>
                        {dispute.autoCloseAt ? <b>Reply by {new Date(dispute.autoCloseAt).toLocaleString()}</b> : dispute.closedInFavorOf ? <b>Favored {dispute.closedInFavorOf.toLowerCase()}</b> : null}
                      </header>
                      <p>{dispute.description}</p>
                      <footer>
                        <Link to={`/orders/${dispute.order?.id}`} className="action-link"><MessageCircle size={14} /> Open chat</Link>
                        <button className="action-link" onClick={() => void sellerRefund(dispute.order?.id, dispute.orderItem?.totalCents ?? dispute.order?.totalCents ?? 0)}><RefreshCw size={14} /> Offer refund</button>
                      </footer>
                    </article>
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
                      <small>{product.type} · {formatMoney(product.priceCents)}</small>
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
          <WalletTabContent user={user} setMessage={setMessage} initialBalance={walletBalance} onBalanceChange={setWalletBalance} />
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

type Deposit = { id: string; amountCents: number; method: string; status: string; reference?: string; depositAddress?: string; txHash?: string | null; screenshotUrl?: string | null; adminNotes?: string | null; expiresAt?: string; createdAt: string };
type Withdrawal = { id: string; amountCents: number; blockchain: string; walletAddress: string; status: string; providerReference?: string | null; adminNotes?: string | null; processedAt?: string | null; createdAt: string };
type WalletSummary = { balanceCents: number; availableBalanceCents: number; frozenSellerBalanceCents: number; pendingWithdrawalCents: number; withdrawals: Withdrawal[] };

function WalletTabContent({ user, setMessage, initialBalance, onBalanceChange }: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  setMessage: (m: string) => void;
  initialBalance: number;
  onBalanceChange: (balanceCents: number) => void;
}) {
  const { formatMoney } = useLocale();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(initialBalance ?? user.balanceCents ?? 0);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [pendingWithdrawalCents, setPendingWithdrawalCents] = useState(0);
  const [busy, setBusy] = useState(false);
  const [depositMethod, setDepositMethod] = useState("CRYPTO_TRC20");
  const [depositAmount, setDepositAmount] = useState("");
  const [activeTopup, setActiveTopup] = useState<Deposit | null>(null);
  const [proofTx, setProofTx] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [withdrawBlockchain, setWithdrawBlockchain] = useState("TRC20 USDT");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    setBalance(initialBalance ?? user.balanceCents ?? 0);
  }, [initialBalance, user.balanceCents]);

  async function refreshWallet() {
    const [summary, depositHistory] = await Promise.all([
      apiRequest<WalletSummary>("/api/wallet/balance"),
      apiRequest<{ deposits: Deposit[] }>("/api/wallet/deposits")
    ]);
    setBalance(summary.availableBalanceCents ?? summary.balanceCents);
    setFrozenBalance(summary.frozenSellerBalanceCents ?? 0);
    setPendingWithdrawalCents(summary.pendingWithdrawalCents ?? 0);
    setWithdrawals(summary.withdrawals ?? []);
    onBalanceChange(summary.availableBalanceCents ?? summary.balanceCents);
    setDeposits(depositHistory.deposits);
  }

  useEffect(() => {
    void refreshWallet().catch(() => undefined);
  }, [onBalanceChange]);

  async function submitDeposit() {
    const cents = Math.round(parseFloat(depositAmount) * 100);
    if (!cents || cents < 100 || cents > 500000) {
      setMessage("Enter an amount between $1.00 and $5,000.00.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ message: string; topup: Deposit }>("/api/wallet/topups", {
        method: "POST",
        body: { amountCents: cents, method: depositMethod }
      });
      setMessage(data.message);
      setActiveTopup(data.topup);
      setProofTx("");
      setProofFile(null);
      await refreshWallet();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Deposit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!activeTopup || !proofTx.trim() || !proofFile) {
      setMessage("Add the transaction ID and payment screenshot before sending your proof.");
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append("txHash", proofTx.trim());
      payload.append("screenshot", proofFile);
      const data = await apiRequest<{ message: string }>(`/api/wallet/topups/${activeTopup.id}/proof`, { method: "POST", body: payload });
      setMessage(data.message);
      setDepositAmount("");
      setActiveTopup(null);
      setProofTx("");
      setProofFile(null);
      await refreshWallet();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Payment proof could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  async function submitWithdrawal() {
    const cents = Math.round(parseFloat(withdrawAmount) * 100);
    if (!cents || cents < 500) {
      setMessage("Minimum withdrawal is $5.00.");
      return;
    }
    if (cents > balance) {
      setMessage("Withdrawal amount is higher than your available balance.");
      return;
    }
    if (withdrawAddress.trim().length < 12) {
      setMessage("Enter a valid wallet address.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/wallet/withdrawals", {
        method: "POST",
        body: { amountCents: cents, blockchain: withdrawBlockchain, walletAddress: withdrawAddress.trim() }
      });
      setMessage("Withdrawal request submitted. It stays pending until admin approval.");
      setWithdrawAmount("");
      setWithdrawAddress("");
      await refreshWallet();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Withdrawal request failed.");
    } finally {
      setBusy(false);
    }
  }

  const methods = [
    { value: "CRYPTO_TRC20", label: "USDT · TRC20", icon: Bitcoin, network: "Tron network" },
    { value: "CRYPTO_BEP20", label: "USDT · BEP20", icon: Bitcoin, network: "BNB Smart Chain" },
    { value: "CRYPTO_ERC20", label: "USDT · ERC20", icon: Bitcoin, network: "Ethereum network" },
    { value: "BTC", label: "Bitcoin · BTC", icon: Bitcoin, network: "Bitcoin network" },
    { value: "ETH", label: "Ethereum · ERC20", icon: DollarSign, network: "Ethereum network" },
    { value: "SOL", label: "Solana · SOL", icon: Smartphone, network: "Solana network" }
  ];
  const chains = ["TRC20 USDT", "ERC20 USDT", "BEP20 USDT", "BTC", "ETH", "SOL", "TON", "Polygon USDT"];

  return (
    <div className="tab-content wallet-tab">
      <header className="tab-header">
        <span className="section-index">BUYER WALLET</span>
        <h1>Top up your balance</h1>
        <p>Send the exact USDT or crypto amount on the selected network, then submit a TXID and screenshot for admin approval.</p>
      </header>

      <div className="wallet-summary-grid">
        <div className="wallet-balance-banner">
          <Wallet size={32} />
          <div>
            <strong>{formatMoney(balance)}</strong>
            <small>Available balance</small>
          </div>
        </div>
        {user.role === "SELLER" ? <div className="wallet-balance-banner muted">
          <LockKeyhole size={28} />
          <div>
            <strong>{formatMoney(frozenBalance)}</strong>
            <small>Frozen seller earnings · releases after 3 days</small>
          </div>
        </div> : null}
        {user.role === "SELLER" ? <div className="wallet-balance-banner muted">
          <RefreshCw size={28} />
          <div>
            <strong>{formatMoney(pendingWithdrawalCents)}</strong>
            <small>Pending withdrawal review</small>
          </div>
        </div> : null}
      </div>

      {user.role !== "SELLER" ? <Link className="seller-application-cta" to="/seller/apply"><Store size={21} /><span><small>GROW WITH HSELLO</small><strong>Apply to become a seller</strong><b>Open application <ArrowRight size={15} /></b></span></Link> : null}

      <div className="wallet-action-grid">
        <div className="wallet-deposit-form">
          <h2>Crypto top-up</h2>
          <p>Choose one network only. We will show its payment address after you set the amount.</p>
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
                max="100000"
                step="0.01"
                placeholder="50.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
            <button className="primary-button" disabled={busy} onClick={() => void submitDeposit()}>
              <PlusCircle size={16} /> {busy ? "Creating…" : "Create payment"}
            </button>
          </div>
          <div className="wallet-safety-note"><ShieldAlert size={16} /><span>Send only on the selected network. A payment sent on another chain cannot be credited automatically.</span></div>
        </div>

        {user.role === "SELLER" ? <div className="wallet-deposit-form withdrawal-form">
          <h2>Withdraw funds</h2>
          <p>Select blockchain, enter your wallet address, and request withdrawal. Admin approval marks it successful.</p>
          <div className="withdraw-grid">
            <div className="field">
              <span>Blockchain / Network</span>
              <select value={withdrawBlockchain} onChange={(e) => setWithdrawBlockchain(e.target.value)}>
                {chains.map((chain) => <option value={chain} key={chain}>{chain}</option>)}
              </select>
            </div>
            <div className="field">
              <span>Amount (USD)</span>
              <input type="number" min="5" step="0.01" placeholder="25.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
            </div>
            <div className="field wide">
              <span>Wallet address</span>
              <input placeholder="Paste your wallet address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} />
            </div>
          </div>
          <button className="primary-button" disabled={busy} onClick={() => void submitWithdrawal()}>
            <Wallet size={16} /> {busy ? "Submitting…" : "Request withdrawal"}
          </button>
        </div> : null}
      </div>

      {activeTopup ? <section className="topup-proof-card">
        <header><div><span className="section-index">PAYMENT REQUEST</span><h2>Send exactly {formatMoney(activeTopup.amountCents)}</h2><p>{activeTopup.method.replaceAll("_", " ")} · request {activeTopup.reference}</p></div><span className="status-pill pending">AWAITING PAYMENT</span></header>
        <div className="topup-address-box"><small>Send only to this address</small><code>{activeTopup.depositAddress}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(activeTopup.depositAddress ?? "")}><ClipboardCopy size={15} /> Copy address</button></div>
        <div className="topup-proof-grid"><label><span>Transaction ID / TXID *</span><input value={proofTx} onChange={(event) => setProofTx(event.target.value)} placeholder="Paste the transaction hash" /></label><label className="topup-upload"><UploadCloud size={21} /><span>{proofFile ? proofFile.name : "Upload payment screenshot *"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} /></label></div>
        <footer><small><Clock3 size={14} /> Proof is checked by admin before wallet balance is added.</small><button className="primary-button" disabled={busy || !proofTx.trim() || !proofFile} onClick={() => void submitProof()}><CheckCircle2 size={16} /> {busy ? "Sending…" : "Send proof for approval"}</button></footer>
      </section> : null}

      {user.role === "SELLER" && withdrawals.length > 0 && (
        <div className="section-block">
          <h2>Withdrawal history <small>({withdrawals.length} total)</small></h2>
          <div className="compact-orders">
            {withdrawals.map((withdrawal) => (
              <div className="compact-order" key={withdrawal.id}>
                <div className="co-left">
                  <Wallet size={16} />
                  <div>
                    <strong>{formatMoney(withdrawal.amountCents)}</strong>
                    <small>{withdrawal.blockchain} · {withdrawal.walletAddress}</small>
                    {withdrawal.adminNotes ? <small>{withdrawal.adminNotes}</small> : null}
                  </div>
                </div>
                <div className="co-right">
                  <span className={`status-pill ${withdrawal.status.toLowerCase()}`}>{withdrawal.status}</span>
                  <small>{new Date(withdrawal.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deposits.length > 0 && (
        <div className="section-block">
          <h2>Deposit history <small>({deposits.length} total)</small></h2>
          <div className="compact-orders">
            {deposits.map((deposit) => (
              <div className="compact-order" key={deposit.id}>
                <div className="co-left">
                  <Bitcoin size={16} />
                  <div>
                    <strong>{formatMoney(deposit.amountCents)}</strong>
                    <small>{deposit.method.replaceAll("_", " ")} · {deposit.reference}</small>
                    {deposit.txHash ? <small>TXID: {deposit.txHash.slice(0, 18)}… {deposit.screenshotUrl ? "· proof attached" : ""}</small> : <button className="action-link" onClick={() => setActiveTopup(deposit)}>Continue payment proof</button>}
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

      {!deposits.length && (user.role !== "SELLER" || !withdrawals.length) && (
        <div className="empty-state-large">
          <Bitcoin size={48} />
          <h2>No wallet history yet</h2>
          <p>Your top-ups will appear here after submission, with a clear pending, completed, or rejected status.</p>
        </div>
      )}
    </div>
  );
}
