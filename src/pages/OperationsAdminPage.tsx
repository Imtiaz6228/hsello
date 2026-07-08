import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderPlus,
  Gavel,
  Headphones,
  LayoutTemplate,
  LogOut,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  Tag,
  UserRoundX,
  Users,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, type Role, type SellerApplication } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";

type Tab =
  | "overview"
  | "sellers"
  | "products"
  | "users"
  | "orders"
  | "payments"
  | "deposits"
  | "refunds"
  | "disputes"
  | "tickets"
  | "categories"
  | "coupons"
  | "reports"
  | "homepage";

type Overview = Record<
  | "pendingSellers"
  | "pendingProducts"
  | "openTickets"
  | "openDisputes"
  | "refundRequests"
  | "awaitingPayments"
  | "pendingDeposits"
  | "users"
  | "orders",
  number
>;

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: Role;
  emailVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string | null;
};

type Product = {
  id: string;
  name: string;
  status: string;
  priceCents: number;
  priceUsdCents?: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  rejectionReason?: string | null;
  category: { name: string };
  files: Array<{ id: string; displayName?: string }>;
  inventoryItems: Array<{ id: string; deliveredAt?: string | null; isActive: boolean }>;
  seller: { id: string; email: string; username: string; sellerProfile?: { storeName: string; isSuspended: boolean } | null };
};

type Order = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  buyer: { firstName: string; lastName: string; email: string };
  payment?: { id: string; method: string; status: string } | null;
  items: Array<{ id: string; productName: string }>;
};

type Deposit = {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  providerReference?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string; username: string; balanceCents: number };
};

type Refund = {
  id: string;
  status: string;
  amountCents: number;
  reason: string;
  createdAt: string;
  order: { orderNumber: string; payment?: { method: string } | null };
  requestedBy: { email: string };
};

type Dispute = { id: string; status: string; subject: string; description: string; createdAt: string; order: { orderNumber: string }; openedBy: { email: string } };
type Ticket = { id: string; ticketNumber: string; status: string; category: string; subject: string; updatedAt: string; creator: { email: string }; messages: Array<{ id: string; body: string; isInternal: boolean; author: { firstName: string; role: string } }> };
type Category = { id: string; name: string; slug: string; description: string; isActive: boolean; sortOrder: number };
type Coupon = { id: string; code: string; percentOff?: number | null; amountOffCents?: number | null; redemptionCount: number; maxRedemptions?: number | null; isActive: boolean; expiresAt?: string | null };
type Report = { id: string; status: string; reason: string; details?: string | null; createdAt: string; adminNotes?: string | null; product: { name: string; slug: string; status: string }; reporter: { email: string } };
type HomepageSection = { id: string; key: string; title: string; subtitle?: string | null; isVisible: boolean; sortOrder: number };

type NavItem = { id: Tab; label: string; icon: LucideIcon };

const nav: NavItem[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "sellers", label: "Seller applications", icon: Store },
  { id: "products", label: "Product approvals", icon: Boxes },
  { id: "users", label: "Users & sellers", icon: Users },
  { id: "orders", label: "All orders", icon: PackageCheck },
  { id: "payments", label: "Order approvals", icon: CircleDollarSign },
  { id: "deposits", label: "Deposit approvals", icon: WalletCards },
  { id: "refunds", label: "Refunds", icon: RefreshCw },
  { id: "disputes", label: "Disputes", icon: Gavel },
  { id: "tickets", label: "Support tickets", icon: Headphones },
  { id: "categories", label: "Categories", icon: FolderPlus },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "reports", label: "Safety reports", icon: ShieldAlert },
  { id: "homepage", label: "Homepage", icon: LayoutTemplate }
];

function money(cents = 0) {
  return `$${(cents / 100).toFixed(2)}`;
}

function Status({ value }: { value: string }) {
  return <span className={`status-pill ${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}

export function OperationsAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);

  const load = useCallback(async () => {
    setMessage("");
    const paths: Record<Tab, string> = {
      overview: "/api/admin/overview",
      sellers: "/api/admin/seller-applications",
      products: "/api/admin/products",
      users: "/api/admin/users",
      orders: "/api/admin/orders",
      payments: "/api/admin/orders",
      deposits: "/api/admin/wallet-deposits",
      refunds: "/api/admin/refunds",
      disputes: "/api/admin/disputes",
      tickets: "/api/admin/tickets",
      categories: "/api/admin/categories",
      coupons: "/api/admin/coupons",
      reports: "/api/admin/reports",
      homepage: "/api/admin/homepage"
    };

    try {
      const data = await apiRequest<Record<string, unknown>>(paths[tab]);
      if (tab === "overview") setOverview(data.overview as Overview);
      if (tab === "sellers") setApplications(data.applications as SellerApplication[]);
      if (tab === "products") setProducts(data.products as Product[]);
      if (tab === "users") setUsers(data.users as AdminUser[]);
      if (tab === "orders" || tab === "payments") setOrders(data.orders as Order[]);
      if (tab === "deposits") setDeposits(data.deposits as Deposit[]);
      if (tab === "refunds") setRefunds(data.refunds as Refund[]);
      if (tab === "disputes") setDisputes(data.disputes as Dispute[]);
      if (tab === "tickets") setTickets(data.tickets as Ticket[]);
      if (tab === "categories") setCategories(data.categories as Category[]);
      if (tab === "coupons") setCoupons(data.coupons as Coupon[]);
      if (tab === "reports") setReports(data.reports as Report[]);
      if (tab === "homepage") setHomepageSections(data.sections as HomepageSection[]);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not load this workspace.");
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, path: string, body: Record<string, unknown>) => {
    setBusy(id);
    setMessage("");
    try {
      await apiRequest(path, { method: "PATCH", body });
      setMessage("Change saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Action failed.");
    } finally {
      setBusy("");
    }
  };

  const post = async (id: string, path: string, body: Record<string, unknown> = {}) => {
    setBusy(id);
    setMessage("");
    try {
      await apiRequest(path, { method: "POST", body });
      setMessage("Action completed.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Action failed.");
    } finally {
      setBusy("");
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((entry) => `${entry.firstName} ${entry.lastName} ${entry.email} ${entry.username}`.toLowerCase().includes(search.toLowerCase())),
    [search, users]
  );
  const pendingOrders = orders.filter((order) => order.payment?.status === "REQUIRES_ACTION");

  return (
    <main className="ops-admin">
      <Seo title="Admin dashboard" description="HSello administration for seller approval, product moderation, deposits, orders, and support." />
      <aside className="ops-sidebar">
        <Link className="brand-lockup" to="/"><span className="brand-glyph">H</span><span><strong>HSELLO</strong><small>ADMIN</small></span></Link>
        <nav>{nav.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><Icon size={16} />{label}<ChevronRight size={14} /></button>)}</nav>
        <div className="admin-sidebar-footer"><div><span>{user?.firstName[0]}{user?.lastName[0]}</span><div><strong>{user?.firstName} {user?.lastName}</strong><small>{user?.role.replace("_", " ")}</small></div></div><button className="secondary-button" onClick={async () => { await logout(); navigate("/"); }}><LogOut size={14} /> Sign out</button></div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar"><div><Link to="/dashboard"><ArrowLeft size={14} /> Account</Link><span>/</span><strong>{nav.find((item) => item.id === tab)?.label}</strong></div><button onClick={() => void load()}><RefreshCw size={14} /> Refresh</button></header>
        <div className="ops-heading"><span className="section-index">ADMIN DASHBOARD</span><h1>{nav.find((item) => item.id === tab)?.label}</h1><p>Approve deposits, review products, verify sellers, and release paid orders without complicated workflows.</p></div>
        {message ? <div className={`ops-message ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not") ? "error" : ""}`}>{message}</div> : null}

        {tab === "overview" && <OverviewPanel overview={overview} onOpen={setTab} />}

        {tab === "sellers" && (
          <section className="ops-grid">
            {applications.length ? applications.map((app) => (
              <article className="ops-card" key={app.id}>
                <header><div><span className="store-avatar">{app.storeName.slice(0, 2).toUpperCase()}</span><div><h2>{app.storeName}</h2><p>{app.fullLegalName} · {app.email}</p></div></div><Status value={app.status} /></header>
                <p>{app.storeDescription}</p>
                <dl><div><dt>Location</dt><dd>{app.city}, {app.country}</dd></div><div><dt>Categories</dt><dd>{app.productCategories.join(", ")}</dd></div><div><dt>Document</dt><dd>{app.documentType?.replaceAll("_", " ") ?? "Not provided"}</dd></div></dl>
                <div className="seller-document-actions">
                  {app.documentFrontOriginalName ? <a href={`/api/admin/seller-applications/${app.id}/documents/front`} target="_blank" rel="noreferrer"><FileText size={14} /> Front side</a> : <span>Front missing</span>}
                  {app.documentBackOriginalName ? <a href={`/api/admin/seller-applications/${app.id}/documents/back`} target="_blank" rel="noreferrer"><FileText size={14} /> Back side</a> : <span>Back missing</span>}
                </div>
                <footer><button className="approve" disabled={busy === app.id} onClick={() => void act(app.id, `/api/admin/seller-applications/${app.id}`, { status: "APPROVED" })}><BadgeCheck size={14} /> Approve</button><button className="danger" disabled={busy === app.id} onClick={() => void act(app.id, `/api/admin/seller-applications/${app.id}`, { status: "REJECTED", adminNotes: window.prompt("Reason for rejection") || "Application does not meet seller requirements." })}><AlertTriangle size={14} /> Reject</button></footer>
              </article>
            )) : <EmptyState label="No seller applications found." />}
          </section>
        )}

        {tab === "products" && (
          <section className="ops-table">
            <div className="ops-row ops-row-head"><span>Product</span><span>Seller</span><span>Delivery</span><span>Actions</span></div>
            {products.map((product) => <div className="ops-row" key={product.id}><div><strong>{product.name}</strong><small>{product.category.name} · {money(product.priceUsdCents ?? product.priceCents)}</small>{product.rejectionReason ? <small>{product.rejectionReason}</small> : null}</div><div><strong>{product.seller.sellerProfile?.storeName ?? product.seller.username}</strong><small>{product.seller.email}</small></div><div><Status value={product.status} /><small>{product.files.length} files · {product.inventoryItems.filter((item) => item.isActive && !item.deliveredAt).length} unsold rows</small></div><div className="row-actions"><button className="approve" disabled={busy === product.id} onClick={() => void act(product.id, `/api/admin/products/${product.id}/status`, { status: "APPROVED" })}><BadgeCheck size={14} /> Approve</button><button disabled={busy === product.id} onClick={() => void act(product.id, `/api/admin/products/${product.id}/status`, { status: "REJECTED", reason: window.prompt("Reason for rejection") || "Product needs changes before approval." })}>Reject</button><button className="danger" disabled={busy === product.id} onClick={() => void act(product.id, `/api/admin/products/${product.id}/status`, { status: "REMOVED", reason: window.prompt("Removal reason") || "Removed by marketplace admin." })}>Remove</button></div></div>)}
          </section>
        )}

        {tab === "users" && (
          <><label className="ops-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" /></label><section className="ops-table"><div className="ops-row ops-row-head"><span>User</span><span>Role</span><span>Status</span><span>Actions</span></div>{filteredUsers.map((entry) => <div className="ops-row" key={entry.id}><div><strong>{entry.firstName} {entry.lastName}</strong><small>{entry.email} · @{entry.username}</small></div><div>{entry.role.replace("_", " ")}</div><div><Status value={entry.isSuspended ? "SUSPENDED" : entry.emailVerified ? "ACTIVE" : "UNVERIFIED"} /></div><div className="row-actions"><button className={entry.isSuspended ? "approve" : "danger"} disabled={busy === entry.id} onClick={() => void act(entry.id, `/api/admin/users/${entry.id}/suspension`, { suspended: !entry.isSuspended, reason: entry.isSuspended ? undefined : window.prompt("Suspension reason") || "Suspended by admin." })}>{entry.isSuspended ? <BadgeCheck size={14} /> : <UserRoundX size={14} />} {entry.isSuspended ? "Unsuspend" : "Suspend"}</button></div></div>)}</section></>
        )}

        {tab === "orders" && <OrdersTable orders={orders} busy={busy} approve={(order) => order.payment ? post(order.payment.id, `/api/admin/payments/${order.payment.id}/approve`) : Promise.resolve()} />}
        {tab === "payments" && <OrdersTable orders={pendingOrders} busy={busy} approve={(order) => order.payment ? post(order.payment.id, `/api/admin/payments/${order.payment.id}/approve`) : Promise.resolve()} emptyLabel="No orders are awaiting admin approval." />}

        {tab === "deposits" && (
          <section className="ops-table"><div className="ops-row ops-row-head"><span>Deposit</span><span>Buyer</span><span>Status</span><span>Actions</span></div>{deposits.map((deposit) => <div className="ops-row" key={deposit.id}><div><strong>{money(deposit.amountCents)}</strong><small>{deposit.method} · {deposit.providerReference ?? "No reference"}</small><small>{new Date(deposit.createdAt).toLocaleString()}</small></div><div><strong>{deposit.user.firstName} {deposit.user.lastName}</strong><small>{deposit.user.email}</small><small>Balance: {money(deposit.user.balanceCents)}</small></div><div><Status value={deposit.status} /><small>{deposit.adminNotes}</small></div><div className="row-actions"><button className="approve" disabled={busy === deposit.id || deposit.status !== "PENDING"} onClick={() => void act(deposit.id, `/api/admin/wallet-deposits/${deposit.id}/approve`, {})}><BadgeCheck size={14} /> Approve deposit</button><button className="danger" disabled={busy === deposit.id || deposit.status !== "PENDING"} onClick={() => void act(deposit.id, `/api/admin/wallet-deposits/${deposit.id}/reject`, { adminNotes: window.prompt("Reason for rejecting this deposit") || "Deposit proof could not be verified." })}><AlertTriangle size={14} /> Reject</button></div></div>)}</section>
        )}

        {tab === "refunds" && <SimpleRows rows={refunds.map((refund) => ({ id: refund.id, title: `${refund.order.orderNumber} · ${money(refund.amountCents)}`, meta: `${refund.requestedBy.email} · ${refund.reason}`, status: refund.status, actions: <><button disabled={busy === refund.id} onClick={() => void act(refund.id, `/api/admin/refunds/${refund.id}`, { status: "COMPLETED" })}>Complete refund</button><button disabled={busy === refund.id} onClick={() => void act(refund.id, `/api/admin/refunds/${refund.id}`, { status: "REJECTED", adminNotes: window.prompt("Reason") || "Rejected by admin." })}>Reject</button></> }))} />}
        {tab === "disputes" && <SimpleRows rows={disputes.map((dispute) => ({ id: dispute.id, title: `${dispute.order.orderNumber} · ${dispute.subject}`, meta: `${dispute.openedBy.email} · ${dispute.description}`, status: dispute.status, actions: <><button disabled={busy === dispute.id} onClick={() => void act(dispute.id, `/api/admin/disputes/${dispute.id}`, { status: "CLOSED", resolution: window.prompt("Resolution note") || "Closed by admin." })}>Close</button></> }))} />}
        {tab === "tickets" && <SimpleRows rows={tickets.map((ticket) => ({ id: ticket.id, title: `${ticket.ticketNumber} · ${ticket.subject}`, meta: `${ticket.creator.email} · ${ticket.category}`, status: ticket.status, actions: <><button disabled={busy === ticket.id} onClick={() => void post(ticket.id, `/api/admin/tickets/${ticket.id}/reply`, { body: window.prompt("Reply") || "Admin reviewed this ticket.", status: "PENDING", isInternal: false })}>Reply</button></> }))} />}
        {tab === "categories" && <SimpleRows rows={categories.map((category) => ({ id: category.id, title: category.name, meta: `${category.slug} · ${category.description}`, status: category.isActive ? "ACTIVE" : "HIDDEN" }))} />}
        {tab === "coupons" && <SimpleRows rows={coupons.map((coupon) => ({ id: coupon.id, title: coupon.code, meta: coupon.percentOff ? `${coupon.percentOff}% off` : `${money(coupon.amountOffCents ?? 0)} off`, status: coupon.isActive ? "ACTIVE" : "INACTIVE" }))} />}
        {tab === "reports" && <SimpleRows rows={reports.map((report) => ({ id: report.id, title: `${report.product.name} · ${report.reason}`, meta: `${report.reporter.email} · ${report.details ?? "No details"}`, status: report.status, actions: <><button disabled={busy === report.id} onClick={() => void act(report.id, `/api/admin/reports/${report.id}`, { status: "ACTIONED", adminNotes: window.prompt("Admin note") || "Reviewed by admin.", removeProduct: false })}>Mark actioned</button><button className="danger" disabled={busy === report.id} onClick={() => void act(report.id, `/api/admin/reports/${report.id}`, { status: "ACTIONED", adminNotes: window.prompt("Removal note") || "Removed after report.", removeProduct: true })}>Remove product</button></> }))} />}
        {tab === "homepage" && <SimpleRows rows={homepageSections.map((section) => ({ id: section.id, title: section.title, meta: `${section.key} · ${section.subtitle ?? "No subtitle"}`, status: section.isVisible ? "VISIBLE" : "HIDDEN" }))} />}
      </section>
    </main>
  );
}

function OverviewPanel({ overview, onOpen }: { overview: Overview | null; onOpen: (tab: Tab) => void }) {
  const cards = [
    { label: "Seller applications", value: overview?.pendingSellers ?? 0, tab: "sellers" as Tab },
    { label: "Product approvals", value: overview?.pendingProducts ?? 0, tab: "products" as Tab },
    { label: "Order approvals", value: overview?.awaitingPayments ?? 0, tab: "payments" as Tab },
    { label: "Deposit approvals", value: overview?.pendingDeposits ?? 0, tab: "deposits" as Tab },
    { label: "Refund requests", value: overview?.refundRequests ?? 0, tab: "refunds" as Tab },
    { label: "Open disputes", value: overview?.openDisputes ?? 0, tab: "disputes" as Tab },
    { label: "Support tickets", value: overview?.openTickets ?? 0, tab: "tickets" as Tab },
    { label: "Total orders", value: overview?.orders ?? 0, tab: "orders" as Tab }
  ];

  return <section className="overview-grid">{cards.map((card) => <button key={card.label} onClick={() => onOpen(card.tab)}><span>{card.label}</span><strong>{card.value}</strong><small>Open workspace</small></button>)}</section>;
}

function OrdersTable({ orders, busy, approve, emptyLabel = "No orders found." }: { orders: Order[]; busy: string; approve: (order: Order) => Promise<void>; emptyLabel?: string }) {
  if (!orders.length) return <EmptyState label={emptyLabel} />;
  return (
    <section className="ops-table"><div className="ops-row ops-row-head"><span>Order</span><span>Buyer</span><span>Status</span><span>Actions</span></div>{orders.map((order) => <div className="ops-row" key={order.id}><div><strong>{order.orderNumber}</strong><small>{order.items.map((item) => item.productName).join(", ")}</small><small>{new Date(order.createdAt).toLocaleString()}</small></div><div><strong>{order.buyer.firstName} {order.buyer.lastName}</strong><small>{order.buyer.email}</small></div><div><Status value={order.status} /><small>{order.payment?.method?.replaceAll("_", " ") ?? "No payment"} · {order.payment?.status ?? "—"}</small></div><div className="row-actions"><a href={`/api/commerce/orders/${order.id}/invoice`}><FileText size={14} /> Invoice</a><button className="approve" disabled={busy === order.payment?.id || order.payment?.status !== "REQUIRES_ACTION"} onClick={() => void approve(order)}><BadgeCheck size={14} /> Approve & deliver</button><strong>{money(order.totalCents)} {order.currency}</strong></div></div>)}</section>
  );
}

function SimpleRows({ rows }: { rows: Array<{ id: string; title: string; meta: string; status: string; actions?: JSX.Element }> }) {
  if (!rows.length) return <EmptyState label="Nothing to show yet." />;
  return <section className="ops-table"><div className="ops-row ops-row-head"><span>Item</span><span>Details</span><span>Status</span><span>Actions</span></div>{rows.map((row) => <div className="ops-row" key={row.id}><div><strong>{row.title}</strong></div><div><small>{row.meta}</small></div><div><Status value={row.status} /></div><div className="row-actions">{row.actions ?? <span>—</span>}</div></div>)}</section>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="ops-empty"><Boxes size={34} /><strong>{label}</strong></div>;
}
