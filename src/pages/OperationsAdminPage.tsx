import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  ImagePlus,
  PackagePlus,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  Tag,
  UserRoundX,
  Users,
  WalletCards,
  Landmark,
  MessageSquare,
  Send,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest, type Role, type SellerApplication } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";

type Tab =
  | "overview"
  | "sellers"
  | "products"
  | "users"
  | "orders"
  | "payments"
  | "deposits"
  | "withdrawals"
  | "refunds"
  | "disputes"
  | "tickets"
  | "chats"
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
  | "pendingWithdrawals"
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
  coverImageUrl?: string | null;
  type?: string;
  category: { id?: string; name: string; parent?: { id?: string; name: string; parent?: { id?: string; name: string } | null } | null };
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

type Withdrawal = { id: string; amountCents: number; blockchain: string; walletAddress: string; status: string; providerReference?: string | null; adminNotes?: string | null; createdAt: string; processedAt?: string | null; user: { firstName: string; lastName: string; email: string; username: string; balanceCents: number; role?: string } };
type Dispute = { id: string; status: string; subject: string; description: string; refundDemanded?: boolean; awaitingParty?: string | null; autoCloseAt?: string | null; closedInFavorOf?: string | null; resolution?: string | null; createdAt: string; order: { id?: string; orderNumber: string; buyer?: { email: string }; items?: Array<{ productName?: string; product?: { name?: string } }> }; openedBy: { email: string } };
type Ticket = { id: string; ticketNumber: string; status: string; category: string; subject: string; updatedAt: string; creator: { email: string }; messages: Array<{ id: string; body: string; isInternal: boolean; author: { firstName: string; role: string } }> };
type Category = { id: string; parentId?: string | null; name: string; slug: string; description: string; isActive: boolean; sortOrder: number };
type Coupon = { id: string; code: string; percentOff?: number | null; amountOffCents?: number | null; redemptionCount: number; maxRedemptions?: number | null; isActive: boolean; expiresAt?: string | null };
type Report = { id: string; status: string; reason: string; details?: string | null; createdAt: string; adminNotes?: string | null; product: { name: string; slug: string; status: string }; reporter: { email: string } };
type HomepageSection = { id: string; key: string; title: string; subtitle?: string | null; isVisible: boolean; sortOrder: number };
type ChatSession = { id: string; subject?: string | null; status: string; updatedAt: string; user: { firstName: string; lastName: string; email: string; role: string }; messages: Array<{ id: string; role: string; body: string; createdAt: string }> };

type NavItem = { id: Tab; label: string; icon: LucideIcon };

const nav: NavItem[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "sellers", label: "Seller applications", icon: Store },
  { id: "products", label: "Product approvals", icon: Boxes },
  { id: "users", label: "Users & sellers", icon: Users },
  { id: "orders", label: "All orders", icon: PackageCheck },
  { id: "payments", label: "Order approvals", icon: CircleDollarSign },
  { id: "deposits", label: "Deposit approvals", icon: WalletCards },
  { id: "withdrawals", label: "Withdrawals", icon: Landmark },
  { id: "refunds", label: "Refunds", icon: RefreshCw },
  { id: "disputes", label: "Disputes", icon: Gavel },
  { id: "tickets", label: "Support tickets", icon: Headphones },
  { id: "chats", label: "Admin chat inbox", icon: MessageSquare },
  { id: "categories", label: "Categories", icon: FolderPlus },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "reports", label: "Safety reports", icon: ShieldAlert },
  { id: "homepage", label: "Homepage", icon: LayoutTemplate }
];

const adminPathTabs: Record<string, Tab> = {
  "/admin/seller-applications": "sellers",
  "/admin/approvals": "products",
  "/admin/live": "chats",
  "/admin/kb/editor": "tickets",
  "/admin/earnings": "overview"
};

function money(cents = 0) {
  return `$${(cents / 100).toFixed(2)}`;
}

function categoryPath(category: Category, categories: Category[]) {
  const names = [category.name];
  let parentId = category.parentId;
  let guard = 0;
  while (parentId && guard < 4) {
    const parent = categories.find((entry) => entry.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
    guard += 1;
  }
  return names.join(" / ");
}

function categoryLevel(category: Category, categories: Category[]) {
  let level = 1;
  let parentId = category.parentId;
  let guard = 0;
  while (parentId && guard < 4) {
    const parent = categories.find((entry) => entry.id === parentId);
    if (!parent) break;
    level += 1;
    parentId = parent.parentId;
    guard += 1;
  }
  return level;
}

function Status({ value }: { value: string }) {
  return <span className={`status-pill ${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}

export function OperationsAdminPage() {
  const { user } = useAuth();
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    return nav.some((item) => item.id === hash) ? hash : adminPathTabs[window.location.pathname] ?? "overview";
  });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "", parentId: "", sortOrder: 1000 });
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [productCreatorOpen, setProductCreatorOpen] = useState(false);
  const [productCreating, setProductCreating] = useState(false);
  const [adminCoverImage, setAdminCoverImage] = useState<File | null>(null);
  const [adminProductForm, setAdminProductForm] = useState({
    rootCategoryId: "", platformCategoryId: "", listingTypeId: "", name: "",
    shortDescription: "", description: "", type: "SERVICE", priceUsd: "", priceCny: "",
    priceRub: "", afterSalesServiceHours: 12, deliveryNote: "", inventoryLines: "", publish: true
  });

  function selectTab(next: Tab) {
    setTabState(next);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
  }

  useEffect(() => {
    const syncTab = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (nav.some((item) => item.id === hash)) setTabState(hash);
    };
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

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
      withdrawals: "/api/admin/withdrawals",
      refunds: "/api/admin/refunds",
      disputes: "/api/admin/disputes",
      tickets: "/api/admin/tickets",
      chats: "/api/nexus/admin/chats",
      categories: "/api/admin/categories",
      coupons: "/api/admin/coupons",
      reports: "/api/admin/reports",
      homepage: "/api/admin/homepage"
    };

    try {
      const data = await apiRequest<Record<string, unknown>>(paths[tab]);
      if (tab === "overview") setOverview(data.overview as Overview);
      if (tab === "sellers") setApplications(data.applications as SellerApplication[]);
      if (tab === "products") {
        setProducts(data.products as Product[]);
        const categoryData = await apiRequest<{ categories: Category[] }>("/api/admin/categories");
        setCategories(categoryData.categories);
      }
      if (tab === "users") setUsers(data.users as AdminUser[]);
      if (tab === "orders" || tab === "payments") setOrders(data.orders as Order[]);
      if (tab === "deposits") setDeposits(data.deposits as Deposit[]);
      if (tab === "withdrawals") setWithdrawals(data.withdrawals as Withdrawal[]);
      if (tab === "refunds") setRefunds(data.refunds as Refund[]);
      if (tab === "disputes") setDisputes(data.disputes as Dispute[]);
      if (tab === "tickets") setTickets(data.tickets as Ticket[]);
      if (tab === "chats") setChatSessions(data.sessions as ChatSession[]);
      if (tab === "categories") setCategories(data.categories as Category[]);
      if (tab === "coupons") setCoupons(data.coupons as Coupon[]);
      if (tab === "reports") setReports(data.reports as Report[]);
      if (tab === "homepage") setHomepageSections(data.sections as HomepageSection[]);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not load this workspace.");
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "chats" && chatSessions.length && !chatSessions.some((session) => session.id === activeChatId)) {
      setActiveChatId(chatSessions[0].id);
    }
  }, [activeChatId, chatSessions, tab]);

  async function sendAdminChat(event: FormEvent) {
    event.preventDefault();
    if (!activeChatId || !chatReply.trim()) return;
    const text = chatReply.trim();
    setChatReply("");
    await post(activeChatId, `/api/nexus/admin/chats/${activeChatId}/reply`, { body: text });
  }

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

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    setCategoryCreating(true);
    setMessage("");
    try {
      await apiRequest("/api/admin/categories", {
        method: "POST",
        body: {
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description,
          parentId: categoryForm.parentId || null,
          sortOrder: categoryForm.sortOrder
        }
      });
      setCategoryForm({ name: "", slug: "", description: "", parentId: "", sortOrder: 1000 });
      setMessage("Category created. It is now available on the homepage and seller product form.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Category could not be created.");
    } finally {
      setCategoryCreating(false);
    }
  }

  async function toggleCategory(category: Category) {
    await act(category.id, `/api/admin/categories/${category.id}`, { isActive: !category.isActive });
  }

  const filteredUsers = useMemo(
    () => users.filter((entry) => `${entry.firstName} ${entry.lastName} ${entry.email} ${entry.username}`.toLowerCase().includes(search.toLowerCase())),
    [search, users]
  );
  const pendingOrders = orders.filter((order) => order.payment?.status === "REQUIRES_ACTION");
  const rootCategories = categories.filter((category) => !category.parentId);
  const platformCategories = categories.filter((category) => category.parentId === adminProductForm.rootCategoryId);
  const listingTypeCategories = categories.filter((category) => category.parentId === adminProductForm.platformCategoryId);
  const adminSelectedCategoryId = adminProductForm.listingTypeId || adminProductForm.platformCategoryId || adminProductForm.rootCategoryId;
  const canManageCatalog = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const availableCategoryParents = categories.filter((category) => category.isActive && categoryLevel(category, categories) < 3);

  async function createAdminProduct(event: FormEvent) {
    event.preventDefault();
    if (!adminSelectedCategoryId) { setMessage("Choose a category path for the catalog product."); return; }
    if (listingTypeCategories.length && !adminProductForm.listingTypeId) { setMessage("Choose the final listing type, such as New or Old."); return; }
    if (!adminCoverImage) { setMessage("Choose a clear product image."); return; }
    if (adminCoverImage.size > 8 * 1024 * 1024) { setMessage("Product image must be 8 MB or smaller."); return; }
    setProductCreating(true);
    setMessage("");
    const data = new FormData();
    data.append("categoryId", adminSelectedCategoryId);
    data.append("name", adminProductForm.name);
    data.append("shortDescription", adminProductForm.shortDescription);
    data.append("description", adminProductForm.description);
    data.append("type", adminProductForm.type);
    data.append("priceUsdCents", String(Math.round(Number(adminProductForm.priceUsd) * 100)));
    if (adminProductForm.priceCny) data.append("priceCnyCents", String(Math.round(Number(adminProductForm.priceCny) * 100)));
    if (adminProductForm.priceRub) data.append("priceRubCents", String(Math.round(Number(adminProductForm.priceRub) * 100)));
    data.append("afterSalesServiceHours", String(adminProductForm.afterSalesServiceHours));
    data.append("deliveryNote", adminProductForm.deliveryNote);
    data.append("inventoryLines", adminProductForm.inventoryLines);
    data.append("publish", String(adminProductForm.publish));
    data.append("coverImage", adminCoverImage);
    try {
      const result = await apiRequest<{ message?: string }>("/api/admin/products", { method: "POST", body: data });
      setMessage(result.message ?? "Catalog product created.");
      setProductCreatorOpen(false);
      setAdminCoverImage(null);
      setAdminProductForm((current) => ({ ...current, name: "", shortDescription: "", description: "", priceUsd: "", priceCny: "", priceRub: "", deliveryNote: "", inventoryLines: "" }));
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Catalog product could not be created.");
    } finally {
      setProductCreating(false);
    }
  }

  return (
    <main className="ops-admin">
      <Seo title="Admin dashboard" description="HSello administration for seller approval, product moderation, deposits, orders, and support." />
      <aside className="ops-sidebar">
        <Link className="brand-lockup" to="/"><span className="brand-glyph">H</span><span><strong>HSELLO</strong><small>ADMIN</small></span></Link>
        <nav>{nav.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} onClick={() => selectTab(id)} key={id}><Icon size={16} />{label}<ChevronRight size={14} /></button>)}</nav>
        <div className="admin-sidebar-footer"><div><span>{user?.firstName[0]}{user?.lastName[0]}</span><div><strong>{user?.firstName} {user?.lastName}</strong><small>{user?.role.replace("_", " ")}</small></div></div><Link className="secondary-button" to="/sign-out"><LogOut size={14} /> Sign out</Link></div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar"><div><Link to="/"><ArrowLeft size={14} /> Marketplace</Link><span>/</span><strong>{nav.find((item) => item.id === tab)?.label}</strong></div><div><LocaleSwitcher /><Link className="dashboard-signout-link" to="/sign-out"><LogOut size={14} /><span>Sign out</span></Link><button onClick={() => void load()}><RefreshCw size={14} /> Refresh</button></div></header>
        <div className="ops-heading"><span className="section-index">ADMIN DASHBOARD</span><h1>{nav.find((item) => item.id === tab)?.label}</h1><p>Approve deposits, review products, verify sellers, and release paid orders without complicated workflows.</p></div>
        {message ? <div className={`ops-message ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not") ? "error" : ""}`}>{message}</div> : null}

        {tab === "overview" && <OverviewPanel overview={overview} onOpen={selectTab} />}

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
          <section className="admin-products-workspace">
            <header className="admin-workspace-toolbar"><div><span className="section-index">CATALOG CONTROL</span><h2>Products and approvals</h2><p>Review seller products or publish an official catalog listing with a full category path.</p></div>{canManageCatalog ? <button className="primary-button" onClick={() => setProductCreatorOpen(true)}><PackagePlus size={16} /> Add catalog product</button> : <small>Only an administrator can publish catalog products.</small>}</header>
            <section className="admin-product-grid">
              {products.length ? products.map((product) => <article className="admin-product-card" key={product.id}><div className="admin-product-image">{product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.name} /> : <ImagePlus />}</div><div className="admin-product-copy"><div><Status value={product.status} /><small>{product.type ?? "DIGITAL"}</small></div><h3>{product.name}</h3><p>{[product.category.parent?.parent?.name, product.category.parent?.name, product.category.name].filter(Boolean).join(" / ")} · {money(product.priceUsdCents ?? product.priceCents)}</p><small>{product.seller.sellerProfile?.storeName ?? product.seller.username} · {product.seller.email}</small><small>{product.files.length} files · {product.inventoryItems.filter((item) => item.isActive && !item.deliveredAt).length} unsold rows</small>{product.rejectionReason ? <b>{product.rejectionReason}</b> : null}</div><footer><button className="approve" disabled={busy === product.id} onClick={() => void act(product.id, `/api/admin/products/${product.id}/status`, { status: "APPROVED" })}><BadgeCheck size={14} /> Approve</button><button disabled={busy === product.id} onClick={() => void act(product.id, `/api/admin/products/${product.id}/status`, { status: "REJECTED", reason: window.prompt("Reason for rejection") || "Product needs changes before approval." })}>Reject</button><button className="danger" disabled={busy === product.id} onClick={() => void act(product.id, `/api/admin/products/${product.id}/status`, { status: "REMOVED", reason: window.prompt("Removal reason") || "Removed by marketplace admin." })}>Remove</button></footer></article>) : <EmptyState label="No products found. Add the first official catalog product." />}
            </section>
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

        {tab === "withdrawals" && (
          <section className="ops-table"><div className="ops-row ops-row-head"><span>Withdrawal</span><span>User</span><span>Status</span><span>Actions</span></div>{withdrawals.map((withdrawal) => <div className="ops-row" key={withdrawal.id}><div><strong>{money(withdrawal.amountCents)}</strong><small>{withdrawal.blockchain} · {withdrawal.providerReference ?? "No reference"}</small><small>{withdrawal.walletAddress}</small><small>{new Date(withdrawal.createdAt).toLocaleString()}</small></div><div><strong>{withdrawal.user.firstName} {withdrawal.user.lastName}</strong><small>{withdrawal.user.email} · @{withdrawal.user.username}</small><small>Available: {money(withdrawal.user.balanceCents)}</small></div><div><Status value={withdrawal.status} /><small>{withdrawal.adminNotes}</small></div><div className="row-actions"><button className="approve" disabled={busy === withdrawal.id || withdrawal.status !== "PENDING"} onClick={() => void act(withdrawal.id, `/api/admin/withdrawals/${withdrawal.id}/approve`, { adminNotes: window.prompt("Approval note / tx hash") || "Withdrawal sent by admin." })}><BadgeCheck size={14} /> Approve paid</button><button className="danger" disabled={busy === withdrawal.id || withdrawal.status !== "PENDING"} onClick={() => void act(withdrawal.id, `/api/admin/withdrawals/${withdrawal.id}/reject`, { adminNotes: window.prompt("Reason for rejection") || "Withdrawal rejected by admin." })}><AlertTriangle size={14} /> Reject & return</button></div></div>)}</section>
        )}

        {tab === "refunds" && <SimpleRows rows={refunds.map((refund) => ({ id: refund.id, title: `${refund.order.orderNumber} · ${money(refund.amountCents)}`, meta: `${refund.requestedBy.email} · ${refund.reason}`, status: refund.status, actions: <><button disabled={busy === refund.id} onClick={() => void act(refund.id, `/api/admin/refunds/${refund.id}`, { status: "COMPLETED" })}>Complete refund</button><button disabled={busy === refund.id} onClick={() => void act(refund.id, `/api/admin/refunds/${refund.id}`, { status: "REJECTED", adminNotes: window.prompt("Reason") || "Rejected by admin." })}>Reject</button></> }))} />}
        {tab === "disputes" && <SimpleRows rows={disputes.map((dispute) => ({ id: dispute.id, title: `${dispute.order.orderNumber} · ${dispute.subject}`, meta: `${dispute.openedBy.email} · ${dispute.description}${dispute.autoCloseAt ? ` · waiting for ${dispute.awaitingParty} until ${new Date(dispute.autoCloseAt).toLocaleString()}` : ""}`, status: dispute.status, actions: <><button className="approve" disabled={busy === dispute.id} onClick={() => void act(dispute.id, `/api/admin/disputes/${dispute.id}`, { status: "RESOLVED_BUYER", resolution: window.prompt("Buyer-favor resolution") || "Admin favored buyer." })}>Favor buyer</button><button disabled={busy === dispute.id} onClick={() => void act(dispute.id, `/api/admin/disputes/${dispute.id}`, { status: "RESOLVED_SELLER", resolution: window.prompt("Seller-favor resolution") || "Admin favored seller." })}>Favor seller</button><button disabled={busy === dispute.id} onClick={() => void post(dispute.id, `/api/admin/disputes/${dispute.id}/message`, { body: window.prompt("Admin message") || "Admin is reviewing this dispute." })}>Message</button><button className="danger" disabled={busy === dispute.id} onClick={() => void act(dispute.id, `/api/admin/disputes/${dispute.id}`, { status: "CLOSED", resolution: window.prompt("Resolution note") || "Closed by admin." })}>Close</button></> }))} />}
        {tab === "tickets" && <SimpleRows rows={tickets.map((ticket) => ({ id: ticket.id, title: `${ticket.ticketNumber} · ${ticket.subject}`, meta: `${ticket.creator.email} · ${ticket.category}`, status: ticket.status, actions: <><button disabled={busy === ticket.id} onClick={() => void post(ticket.id, `/api/admin/tickets/${ticket.id}/reply`, { body: window.prompt("Reply") || "Admin reviewed this ticket.", status: "PENDING", isInternal: false })}>Reply</button></> }))} />}
        {tab === "chats" && <section className="admin-chat-console">{chatSessions.length ? <><aside className="admin-chat-list">{chatSessions.map((session) => <button key={session.id} className={activeChatId === session.id ? "active" : ""} onClick={() => setActiveChatId(session.id)}><span className="chat-user-avatar">{session.user.firstName[0]}{session.user.lastName[0]}</span><span><strong>{session.user.firstName} {session.user.lastName}</strong><small>{session.messages[session.messages.length - 1]?.body ?? "No messages"}</small></span><Status value={session.status} /></button>)}</aside>{chatSessions.filter((session) => session.id === activeChatId).map((session) => <article className="admin-chat-focus" key={session.id}><header><div className="chat-user-avatar">{session.user.firstName[0]}{session.user.lastName[0]}</div><div><strong>{session.user.firstName} {session.user.lastName}</strong><small>{session.user.email} · {session.user.role.toLowerCase()}</small></div><Status value={session.status} /></header><div className="admin-chat-thread">{session.messages.map((entry) => <div className={`admin-chat-message ${entry.role}`} key={entry.id}><small>{entry.role === "admin" ? "Admin" : entry.role === "assistant" ? "AI assistant" : session.user.firstName}</small><p>{entry.body}</p></div>)}</div><form className="admin-chat-composer" onSubmit={sendAdminChat}><textarea value={chatReply} onChange={(event) => setChatReply(event.target.value)} placeholder={`Reply to ${session.user.firstName}…`} rows={3} /><button disabled={busy === session.id || !chatReply.trim()}><Send size={15} /> {busy === session.id ? "Sending…" : "Send reply"}</button></form></article>)}</> : <EmptyState label="No support conversations yet." />}</section>}
        {tab === "categories" && <section className="admin-category-workspace">
          {canManageCatalog ? <form className="admin-category-creator" onSubmit={createCategory}>
            <header><span><FolderPlus /></span><div><h2>Create category or subcategory</h2><p>New entries instantly flow into homepage browsing and the seller product form.</p></div></header>
            <div className="form-grid two">
              <label><span>Name</span><input required minLength={2} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} placeholder="Facebook services" /></label>
              <label><span>URL slug</span><input value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="facebook-services" /></label>
              <label><span>Parent category</span><select value={categoryForm.parentId} onChange={(event) => setCategoryForm({ ...categoryForm, parentId: event.target.value })}><option value="">Create as main category</option>{availableCategoryParents.map((category) => <option value={category.id} key={category.id}>{categoryPath(category, categories)}</option>)}</select><small>Supports three levels: category → platform → listing type.</small></label>
              <label><span>Sort order</span><input type="number" min={0} max={10000} value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: Number(event.target.value) })} /></label>
            </div>
            <label><span>Description</span><textarea required minLength={12} rows={4} value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Explain what buyers will find in this category." /></label>
            <button className="primary-button" disabled={categoryCreating}><FolderPlus size={16} /> {categoryCreating ? "Creating…" : "Create category"}</button>
          </form> : <div className="admin-category-creator admin-readonly-card"><FolderPlus /><h2>Category catalog</h2><p>You can review the structure. An administrator account is required to create or change categories.</p></div>}
          <div className="admin-category-tree">
            {categories.filter((category) => !category.parentId).map((parent) => <article key={parent.id} className={!parent.isActive ? "disabled" : ""}><header><div><span>{parent.name.slice(0, 2).toUpperCase()}</span><div><strong>{parent.name}</strong><small>/{parent.slug}</small></div></div><button type="button" disabled={!canManageCatalog} onClick={() => void toggleCategory(parent)}>{parent.isActive ? "Visible" : "Hidden"}</button></header><p>{parent.description}</p><div>{categories.filter((child) => child.parentId === parent.id).map((child) => <section className="admin-category-branch" key={child.id}><button type="button" disabled={!canManageCatalog} className={!child.isActive ? "disabled" : ""} onClick={() => void toggleCategory(child)}><span>{child.name}</span><small>{child.isActive ? "Live" : "Hidden"}</small></button><div>{categories.filter((leaf) => leaf.parentId === child.id).map((leaf) => <button type="button" disabled={!canManageCatalog} key={leaf.id} className={`category-leaf ${!leaf.isActive ? "disabled" : ""}`} onClick={() => void toggleCategory(leaf)}><span>{leaf.name}</span><small>{leaf.isActive ? "Live" : "Hidden"}</small></button>)}</div></section>)}</div></article>)}
          </div>
        </section>}
        {tab === "coupons" && <SimpleRows rows={coupons.map((coupon) => ({ id: coupon.id, title: coupon.code, meta: coupon.percentOff ? `${coupon.percentOff}% off` : `${money(coupon.amountOffCents ?? 0)} off`, status: coupon.isActive ? "ACTIVE" : "INACTIVE" }))} />}
        {tab === "reports" && <SimpleRows rows={reports.map((report) => ({ id: report.id, title: `${report.product.name} · ${report.reason}`, meta: `${report.reporter.email} · ${report.details ?? "No details"}`, status: report.status, actions: <><button disabled={busy === report.id} onClick={() => void act(report.id, `/api/admin/reports/${report.id}`, { status: "ACTIONED", adminNotes: window.prompt("Admin note") || "Reviewed by admin.", removeProduct: false })}>Mark actioned</button><button className="danger" disabled={busy === report.id} onClick={() => void act(report.id, `/api/admin/reports/${report.id}`, { status: "ACTIONED", adminNotes: window.prompt("Removal note") || "Removed after report.", removeProduct: true })}>Remove product</button></> }))} />}
        {tab === "homepage" && <SimpleRows rows={homepageSections.map((section) => ({ id: section.id, title: section.title, meta: `${section.key} · ${section.subtitle ?? "No subtitle"}`, status: section.isVisible ? "VISIBLE" : "HIDDEN" }))} />}
      </section>

      {productCreatorOpen ? <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add catalog product"><form className="seller-product-form admin-product-form" onSubmit={createAdminProduct}><button type="button" className="modal-close" onClick={() => setProductCreatorOpen(false)}>×</button><span className="section-index">OFFICIAL CATALOG</span><h2>Add a marketplace product</h2><p className="modal-helper">Choose the complete category path, upload a clear image, and publish directly or save as draft.</p><label className="admin-product-image-picker">{adminCoverImage ? <img src={URL.createObjectURL(adminCoverImage)} alt="Product preview" /> : <ImagePlus size={34} />}<span>Product image *</span><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAdminCoverImage(event.target.files?.[0] ?? null)} /><small>JPEG, PNG or WebP · max 8 MB</small></label><section className="seller-category-flow"><div className="form-grid three"><label><span>Main category</span><select required value={adminProductForm.rootCategoryId} onChange={(event) => setAdminProductForm({ ...adminProductForm, rootCategoryId: event.target.value, platformCategoryId: "", listingTypeId: "" })}><option value="">Choose category</option>{rootCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label><span>Platform / subcategory</span><select required={platformCategories.length > 0} disabled={!platformCategories.length} value={adminProductForm.platformCategoryId} onChange={(event) => setAdminProductForm({ ...adminProductForm, platformCategoryId: event.target.value, listingTypeId: "" })}><option value="">{platformCategories.length ? "Choose platform" : "No second level"}</option>{platformCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label><span>Listing type</span><select required={listingTypeCategories.length > 0} disabled={!listingTypeCategories.length} value={adminProductForm.listingTypeId} onChange={(event) => setAdminProductForm({ ...adminProductForm, listingTypeId: event.target.value })}><option value="">{listingTypeCategories.length ? "Choose New / Old / other" : "No third level"}</option>{listingTypeCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div></section><div className="form-grid two"><label><span>Product title</span><input required minLength={3} value={adminProductForm.name} onChange={(event) => setAdminProductForm({ ...adminProductForm, name: event.target.value })} /></label><label><span>Product type</span><select value={adminProductForm.type} onChange={(event) => setAdminProductForm({ ...adminProductForm, type: event.target.value })}><option value="SERVICE">Service</option><option value="DOWNLOAD">Digital download</option></select></label><label><span>Price USD</span><input required type="number" min="0.50" step="0.01" value={adminProductForm.priceUsd} onChange={(event) => setAdminProductForm({ ...adminProductForm, priceUsd: event.target.value })} /></label><label><span>Price CNY</span><input type="number" min="0" step="0.01" value={adminProductForm.priceCny} onChange={(event) => setAdminProductForm({ ...adminProductForm, priceCny: event.target.value })} /></label><label><span>Price RUB</span><input type="number" min="0" step="0.01" value={adminProductForm.priceRub} onChange={(event) => setAdminProductForm({ ...adminProductForm, priceRub: event.target.value })} /></label><label><span>After-sales hours</span><input required type="number" min={12} max={8760} value={adminProductForm.afterSalesServiceHours} onChange={(event) => setAdminProductForm({ ...adminProductForm, afterSalesServiceHours: Number(event.target.value) })} /></label></div><label><span>Short description</span><input required minLength={10} maxLength={240} value={adminProductForm.shortDescription} onChange={(event) => setAdminProductForm({ ...adminProductForm, shortDescription: event.target.value })} /></label><label><span>Full description</span><textarea required minLength={30} rows={5} value={adminProductForm.description} onChange={(event) => setAdminProductForm({ ...adminProductForm, description: event.target.value })} /></label><label><span>Delivery note</span><textarea rows={3} value={adminProductForm.deliveryNote} onChange={(event) => setAdminProductForm({ ...adminProductForm, deliveryNote: event.target.value })} /></label>{adminProductForm.type === "DOWNLOAD" ? <label><span>Inventory rows</span><textarea rows={5} placeholder="One deliverable per line. Required to publish a download immediately." value={adminProductForm.inventoryLines} onChange={(event) => setAdminProductForm({ ...adminProductForm, inventoryLines: event.target.value })} /></label> : null}<label className="admin-publish-toggle"><input type="checkbox" checked={adminProductForm.publish} onChange={(event) => setAdminProductForm({ ...adminProductForm, publish: event.target.checked })} /><span>Publish to the catalog immediately</span></label><button className="primary-button" disabled={productCreating}><PackagePlus size={16} /> {productCreating ? "Creating…" : "Create catalog product"}</button></form></div> : null}
    </main>
  );
}

function OverviewPanel({ overview, onOpen }: { overview: Overview | null; onOpen: (tab: Tab) => void }) {
  const cards = [
    { label: "Seller applications", value: overview?.pendingSellers ?? 0, tab: "sellers" as Tab },
    { label: "Product approvals", value: overview?.pendingProducts ?? 0, tab: "products" as Tab },
    { label: "Order approvals", value: overview?.awaitingPayments ?? 0, tab: "payments" as Tab },
    { label: "Deposit approvals", value: overview?.pendingDeposits ?? 0, tab: "deposits" as Tab },
    { label: "Withdrawal approvals", value: overview?.pendingWithdrawals ?? 0, tab: "withdrawals" as Tab },
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
