import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BadgeCheck, BarChart3, Boxes, CheckCircle2, FileUp, ImagePlus,
  LayoutDashboard, LogOut, PackagePlus, Palette, Send, ShoppingBag, Store,
  Upload, WalletCards, MessageSquare, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { Seo } from "../components/Seo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  parent?: Category | null;
};

type Product = {
  id: string;
  name: string;
  status: string;
  type: string;
  priceCents: number;
  priceUsdCents?: number;
  afterSalesServiceHours?: number;
  coverImageUrl?: string | null;
  rejectionReason?: string | null;
  category?: Category & { parent?: (Category & { parent?: Category | null }) | null };
  files: Array<{ id: string; displayName: string; version: number; sizeBytes: number }>;
  inventoryItems: Array<{ id: string; deliveredAt?: string | null; isActive: boolean }>;
};

type SellerProfile = {
  storeName: string;
  slug: string;
  about: string;
  policy?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number | string;
};

type SellerOrder = {
  id: string;
  productName: string;
  totalCents: number;
  quantity: number;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    buyer: { firstName: string; lastName: string; email: string };
    payment?: { status: string } | null;
  };
};

type Tab = "overview" | "products" | "orders" | "messages" | "storefront";

const sellerTabs: Array<{ id: Tab; label: string; icon: typeof Store }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Boxes },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "storefront", label: "Store branding", icon: Palette }
];

const initialForm = {
  rootCategoryId: "",
  platformCategoryId: "",
  listingTypeId: "",
  name: "",
  shortDescription: "",
  description: "",
  type: "DOWNLOAD",
  priceUsd: "",
  priceCny: "",
  priceRub: "",
  deliveryNote: "",
  afterSalesServiceHours: 12,
  downloadLimit: 5,
  downloadExpiryHours: 168,
  buyersGetUpdates: true,
  inventoryLines: ""
};

function cents(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function validTab(value: string): value is Tab {
  return sellerTabs.some((item) => item.id === value);
}

function errorText(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const details = error.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[]; issues?: Array<{ path?: string; message?: string }> } | Array<{ path?: string; message?: string }> | undefined;
  if (Array.isArray(details)) {
    const issue = details.find((entry) => entry?.message);
    return issue ? `${issue.path ? `${issue.path}: ` : ""}${issue.message}` : error.message;
  }
  const fieldMessage = details?.fieldErrors
    ? Object.entries(details.fieldErrors).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`)).find(Boolean)
    : undefined;
  const issue = details?.issues?.find((entry) => entry.message);
  return fieldMessage || details?.formErrors?.[0] || (issue ? `${issue.path ? `${issue.path}: ` : ""}${issue.message}` : undefined) || error.message;
}

function categoryLabel(category?: Product["category"]) {
  if (!category) return "Uncategorised";
  const names = [category.parent?.parent?.name, category.parent?.name, category.name].filter(Boolean);
  return names.join(" / ");
}

export function SellerStudioPage() {
  const { formatMoney } = useLocale();
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "");
    return validTab(hash) ? hash : "overview";
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ about: "", policy: "" });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [form, setForm] = useState(initialForm);

  const rootCategories = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const platformCategories = useMemo(
    () => categories.filter((category) => category.parentId === form.rootCategoryId),
    [categories, form.rootCategoryId]
  );
  const listingTypes = useMemo(
    () => categories.filter((category) => category.parentId === form.platformCategoryId),
    [categories, form.platformCategoryId]
  );
  const selectedCategoryId = form.listingTypeId || form.platformCategoryId || form.rootCategoryId;
  const selectedPath = [
    categories.find((category) => category.id === form.rootCategoryId)?.name,
    categories.find((category) => category.id === form.platformCategoryId)?.name,
    categories.find((category) => category.id === form.listingTypeId)?.name
  ].filter(Boolean);
  const pendingProducts = products.filter((product) => product.status === "PENDING").length;
  const liveProducts = products.filter((product) => product.status === "APPROVED").length;
  const grossSales = orders.reduce((sum, item) => sum + item.totalCents, 0);

  function showMessage(text: string, type: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function selectTab(next: Tab) {
    setTabState(next);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
  }

  useEffect(() => {
    const syncTab = () => {
      const hash = window.location.hash.replace("#", "");
      if (validTab(hash)) setTabState(hash);
    };
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

  const load = useCallback(async () => {
    const [productsData, categoriesData, profileData, ordersData] = await Promise.all([
      apiRequest<{ products: Product[] }>("/api/seller/products"),
      apiRequest<{ categories: Category[] }>("/api/seller/categories"),
      apiRequest<{ profile: SellerProfile }>("/api/seller/profile"),
      apiRequest<{ items: SellerOrder[] }>("/api/seller/orders")
    ]);
    setProducts(productsData.products);
    setCategories(categoriesData.categories);
    setOrders(ordersData.items);
    setProfile(profileData.profile);
    setProfileForm({ about: profileData.profile?.about ?? "", policy: profileData.profile?.policy ?? "" });
    setForm((current) => {
      if (current.rootCategoryId) return current;
      const firstRoot = categoriesData.categories.find((category) => !category.parentId);
      return firstRoot ? { ...current, rootCategoryId: firstRoot.id } : current;
    });
  }, []);

  useEffect(() => {
    void load().catch((error) => showMessage(errorText(error, "Seller data could not be loaded."), "error"));
  }, [load]);

  useEffect(() => {
    if (!coverImage) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(coverImage);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverImage]);

  function chooseImage(file?: File) {
    if (!file) {
      setCoverImage(null);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showMessage("Image must be 8 MB or smaller.", "error");
      return;
    }
    setCoverImage(file);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!selectedCategoryId) {
      showMessage("Choose the full category path before creating the product.", "error");
      return;
    }
    if (listingTypes.length && !form.listingTypeId) {
      showMessage("Choose a listing type such as New, Old, With audience, or Business ready.", "error");
      return;
    }
    if (!coverImage) {
      showMessage("Upload a clear product image before creating the listing.", "error");
      return;
    }
    if (form.name.trim().length < 3 || form.shortDescription.trim().length < 10 || form.description.trim().length < 30) {
      showMessage("Complete the title, short description, and full description before submitting.", "error");
      return;
    }
    if (cents(form.priceUsd) < 50) {
      showMessage("Set a USD price of at least $0.50.", "error");
      return;
    }

    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.append("categoryId", selectedCategoryId);
    data.append("name", form.name.trim());
    data.append("shortDescription", form.shortDescription.trim());
    data.append("description", form.description.trim());
    data.append("type", form.type);
    data.append("priceUsdCents", String(cents(form.priceUsd)));
    if (form.priceCny) data.append("priceCnyCents", String(cents(form.priceCny)));
    if (form.priceRub) data.append("priceRubCents", String(cents(form.priceRub)));
    data.append("currency", "USD");
    data.append("deliveryNote", form.deliveryNote.trim());
    data.append("afterSalesServiceHours", String(form.afterSalesServiceHours));
    data.append("downloadLimit", String(form.downloadLimit));
    data.append("downloadExpiryHours", String(form.downloadExpiryHours));
    data.append("buyersGetUpdates", String(form.buyersGetUpdates));
    data.append("inventoryLines", form.inventoryLines.trim());
    // SEO limits are intentionally smaller than the visible product fields.
    data.append("seoTitle", form.name.trim().slice(0, 70));
    data.append("seoDescription", form.shortDescription.trim().slice(0, 170));
    data.append("coverImage", coverImage);

    try {
      const result = await apiRequest<{ message?: string }>("/api/seller/products", { method: "POST", body: data });
      setOpen(false);
      setCoverImage(null);
      setForm((current) => ({
        ...initialForm,
        rootCategoryId: current.rootCategoryId,
        platformCategoryId: current.platformCategoryId,
        listingTypeId: current.listingTypeId
      }));
      showMessage(result.message ?? "Product created and sent for approval.", "success");
      selectTab("products");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Product could not be created."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(productId: string, file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return showMessage("Image must be 8 MB or smaller.", "error");
    const data = new FormData();
    data.append("coverImage", file);
    showMessage("Uploading product image…");
    try {
      await apiRequest(`/api/seller/products/${productId}/image`, { method: "POST", body: data });
      showMessage("Product image uploaded successfully.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Image upload failed."), "error");
    }
  }

  async function uploadDeliveryFile(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    showMessage("Uploading delivery file…");
    try {
      await apiRequest(`/api/seller/products/${productId}/files`, { method: "POST", body: data });
      showMessage("Delivery file uploaded.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "File upload failed."), "error");
    }
  }

  async function uploadInventoryFile(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    try {
      const result = await apiRequest<{ count: number }>(`/api/seller/products/${productId}/inventory/file`, { method: "POST", body: data });
      showMessage(`${result.count} inventory row${result.count === 1 ? "" : "s"} added.`, "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Inventory upload failed."), "error");
    }
  }

  async function addInventoryRows(productId: string) {
    const inventoryLines = window.prompt("Paste one digital item, code, or license per line:");
    if (!inventoryLines?.trim()) return;
    try {
      const result = await apiRequest<{ count: number }>(`/api/seller/products/${productId}/inventory/manual`, {
        method: "POST",
        body: { inventoryLines }
      });
      showMessage(`${result.count} inventory row${result.count === 1 ? "" : "s"} added.`, "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Inventory rows could not be added."), "error");
    }
  }

  async function submit(productId: string) {
    try {
      await apiRequest(`/api/seller/products/${productId}/submit`, { method: "POST" });
      showMessage("Product submitted for admin approval.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Product could not be submitted."), "error");
    }
  }

  async function uploadStoreMedia(kind: "logo" | "banner", file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return showMessage("Image must be 8 MB or smaller.", "error");
    const data = new FormData();
    data.append(kind, file);
    setBusy(true);
    showMessage(`Uploading store ${kind}…`);
    try {
      const result = await apiRequest<{ profile: SellerProfile; message?: string }>(`/api/seller/profile/${kind}`, { method: "POST", body: data });
      setProfile(result.profile);
      showMessage(result.message ?? `Store ${kind} uploaded.`, "success");
    } catch (error) {
      showMessage(errorText(error, `Store ${kind} upload failed.`), "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await apiRequest<{ profile: SellerProfile }>("/api/seller/profile", { method: "PATCH", body: profileForm });
      setProfile(result.profile);
      showMessage("Store information saved.", "success");
    } catch (error) {
      showMessage(errorText(error, "Store information could not be saved."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="seller-pro-dashboard">
      <Seo title="Seller studio" description="Manage your storefront, products, files, orders, and digital delivery." />
      <aside className="seller-pro-sidebar">
        <Link className="brand-lockup" to="/"><span className="brand-glyph">H</span><span><strong>HSELLO</strong><small>SELLER CENTER</small></span></Link>
        <div className="seller-store-card">
          <span>{profile?.logoUrl ? <img src={profile.logoUrl} alt={`${profile.storeName} logo`} /> : (profile?.storeName ?? "Store").slice(0, 2).toUpperCase()}</span>
          <div><strong>{profile?.storeName ?? "Your store"}</strong><small>{profile?.isVerified ? "Verified seller" : "Seller account"}</small></div>
          {profile?.isVerified ? <BadgeCheck size={17} /> : null}
        </div>
        <nav>{sellerTabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? "active" : ""} onClick={() => selectTab(id)}><Icon size={18} />{label}</button>)}</nav>
        <div className="seller-pro-sidebar-footer"><Link to="/dashboard"><ArrowLeft size={16} /> Buyer account</Link><Link to="/sign-out"><LogOut size={16} /> Sign out</Link></div>
      </aside>

      <section className="seller-pro-main">
        <header className="seller-pro-topbar">
          <div><span>Seller center</span><strong>{sellerTabs.find((item) => item.id === tab)?.label}</strong></div>
          <div><LocaleSwitcher compact /><Link className="dashboard-signout-link" to="/sign-out" aria-label="Sign out"><LogOut size={17} /><span>Sign out</span></Link><button className="seller-create-button" onClick={() => setOpen(true)}><PackagePlus size={17} /> New product</button></div>
        </header>
        <div className="seller-pro-heading"><span className="section-index">SELLER WORKSPACE</span><h1>{tab === "overview" ? `Welcome back to ${profile?.storeName ?? "your store"}.` : sellerTabs.find((item) => item.id === tab)?.label}</h1><p>Manage every part of your digital business from one colorful, connected workspace.</p></div>
        {message ? <div className={`dashboard-message ${messageType}`}>{message}</div> : null}

        {tab === "overview" ? <>
          <section className="seller-metric-grid">
            <article><span><Boxes /></span><div><small>Total products</small><strong>{products.length}</strong><p>{liveProducts} currently live</p></div></article>
            <article><span><BarChart3 /></span><div><small>Pending approval</small><strong>{pendingProducts}</strong><p>Admin review queue</p></div></article>
            <article><span><ShoppingBag /></span><div><small>Orders</small><strong>{orders.length}</strong><p>Across all products</p></div></article>
            <article><span><WalletCards /></span><div><small>Gross order value</small><strong>{formatMoney(grossSales)}</strong><p>Before platform fees</p></div></article>
          </section>
          <section className="seller-overview-grid">
            <article className="seller-gradient-card"><span>STORE PERFORMANCE</span><h2>Build listings buyers trust.</h2><p>Use a sharp logo, clear product image, accurate category path, and complete delivery inventory.</p><button onClick={() => selectTab("storefront")}><Palette size={17} /> Polish storefront</button></article>
            <article className="seller-action-panel"><header><h2>Quick actions</h2><small>Everything opens instantly</small></header><button onClick={() => setOpen(true)}><PackagePlus /><span><strong>Create product</strong><small>Add image, price and category</small></span></button><button onClick={() => selectTab("products")}><Upload /><span><strong>Manage delivery</strong><small>Files, codes and inventory</small></span></button><button onClick={() => selectTab("orders")}><ShoppingBag /><span><strong>View orders</strong><small>Buyer and payment status</small></span></button></article>
          </section>
        </> : null}

        {tab === "products" ? <section className="seller-product-list seller-pro-products">
          <div className="seller-list-heading"><span>Product</span><span>Status</span><span>Delivery</span><span>Actions</span></div>
          {products.length ? products.map((product) => {
            const availableRows = product.inventoryItems.filter((item) => item.isActive && !item.deliveredAt).length;
            const deliveredRows = product.inventoryItems.filter((item) => item.deliveredAt).length;
            return <article key={product.id}>
              <div><span className="seller-product-mark">{product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.name} /> : product.name[0]}</span><div><strong>{product.name}</strong><small>{categoryLabel(product.category)}</small><small>{formatMoney(product.priceUsdCents ?? product.priceCents)} · After-sales {product.afterSalesServiceHours ?? 12}h</small>{product.rejectionReason ? <p>{product.rejectionReason}</p> : null}</div></div>
              <span className={`status-pill ${product.status.toLowerCase()}`}>{product.status.replaceAll("_", " ")}</span>
              <div className="file-versions">{product.files.map((file) => <span key={file.id}>{file.displayName} <small>v{file.version}</small></span>)}{availableRows || deliveredRows ? <span>{availableRows} available <small>{deliveredRows} delivered</small></span> : null}{!product.files.length && !availableRows && !deliveredRows ? <small>No delivery added</small> : null}</div>
              <div className="seller-product-actions"><label className="upload-action"><ImagePlus /> Change image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(product.id, event.target.files?.[0])} /></label><label className="upload-action"><Upload /> Delivery file<input type="file" onChange={(event) => void uploadDeliveryFile(product.id, event.target.files?.[0])} /></label><label className="upload-action"><FileUp /> Inventory file<input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(event) => void uploadInventoryFile(product.id, event.target.files?.[0])} /></label><button type="button" onClick={() => void addInventoryRows(product.id)}><PackagePlus /> Add rows</button>{!["PENDING", "APPROVED", "REMOVED"].includes(product.status) ? <button onClick={() => void submit(product.id)}><Send /> Submit review</button> : null}</div>
            </article>;
          }) : <div className="dashboard-empty"><FileUp /><h2>No products yet</h2><p>Create your first listing with a product image and the full admin-managed category path.</p><button className="primary-button" onClick={() => setOpen(true)}>Create product</button></div>}
        </section> : null}

        {tab === "orders" ? <section className="seller-orders-grid">{orders.length ? orders.map((item) => <article key={item.id}><header><span>{item.productName.slice(0, 2).toUpperCase()}</span><div><strong>{item.productName}</strong><small>{item.order.orderNumber} · {new Date(item.order.createdAt).toLocaleDateString()}</small></div><b>{item.order.status.replaceAll("_", " ")}</b></header><div><span><small>Buyer</small><strong>{item.order.buyer.firstName} {item.order.buyer.lastName}</strong></span><span><small>Quantity</small><strong>{item.quantity}</strong></span><span><small>Total</small><strong>{formatMoney(item.totalCents)}</strong></span><span><small>Payment</small><strong>{item.order.payment?.status ?? "Pending"}</strong></span></div><footer><Link to={`/orders/${item.order.id}`}><MessageSquare size={15} /> Open buyer chat <ArrowRight size={14} /></Link></footer></article>) : <div className="dashboard-empty"><ShoppingBag /><h2>No seller orders yet</h2><p>Approved products and completed purchases will appear here.</p></div>}</section> : null}

        {tab === "messages" ? <section className="seller-message-center"><header><div><span className="section-index">ORDER INBOX</span><h2>Buyer conversations</h2><p>Chats are tied to real orders, keeping delivery and dispute history protected.</p></div><span>{orders.length} conversations</span></header>{orders.length ? <div>{orders.map((item) => <Link to={`/orders/${item.order.id}`} key={item.id}><span>{item.order.buyer.firstName[0]}{item.order.buyer.lastName[0]}</span><div><strong>{item.order.buyer.firstName} {item.order.buyer.lastName}</strong><small>{item.productName} · {item.order.orderNumber}</small></div><b className={`status-pill ${item.order.status.toLowerCase()}`}>{item.order.status.replaceAll("_", " ")}</b><ArrowRight /></Link>)}</div> : <div className="dashboard-empty"><MessageSquare /><h2>No conversations yet</h2><p>Buyer chats become available as soon as you receive an order.</p></div>}</section> : null}

        {tab === "storefront" ? <section className="seller-branding-layout">
          <article className="seller-brand-preview" style={profile?.bannerUrl ? { backgroundImage: `linear-gradient(135deg, rgba(19,27,52,.78), rgba(87,62,211,.55)), url(${profile.bannerUrl})` } : undefined}><span>{profile?.logoUrl ? <img src={profile.logoUrl} alt="Store logo" /> : (profile?.storeName ?? "Store").slice(0, 2).toUpperCase()}</span><div><small>PUBLIC STOREFRONT</small><h2>{profile?.storeName}</h2><p>{profile?.about}</p><b>{profile?.isVerified ? "✓ Verified seller" : "Seller"}</b></div></article>
          <form className="seller-brand-form" onSubmit={saveProfile}><header><span><Store /></span><div><h2>Store identity</h2><p>Upload clear image files. They are saved and shown on your public storefront.</p></div></header><div className="seller-media-upload-grid"><label><span>{profile?.logoUrl ? <img src={profile.logoUrl} alt="Current logo" /> : <ImagePlus />}</span><strong>Upload logo</strong><small>Square JPEG, PNG or WebP · max 8 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void uploadStoreMedia("logo", event.target.files?.[0])} /></label><label><span className="wide">{profile?.bannerUrl ? <img src={profile.bannerUrl} alt="Current banner" /> : <ImagePlus />}</span><strong>Upload banner</strong><small>Wide JPEG, PNG or WebP · max 8 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void uploadStoreMedia("banner", event.target.files?.[0])} /></label></div><label><span>About your store</span><textarea required minLength={20} rows={6} value={profileForm.about} onChange={(event) => setProfileForm({ ...profileForm, about: event.target.value })} /></label><label><span>Store policy</span><textarea rows={5} value={profileForm.policy} onChange={(event) => setProfileForm({ ...profileForm, policy: event.target.value })} placeholder="Delivery, support and refund expectations" /></label><button className="primary-button" disabled={busy}><Store /> {busy ? "Saving…" : "Save storefront"}</button></form>
        </section> : null}
      </section>

      {open ? <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create product"><form className="seller-product-form seller-pro-product-form" onSubmit={create}><button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">×</button><span className="section-index">NEW PRODUCT</span><h2>Create a smooth, buyer-friendly listing.</h2><p className="modal-helper">Follow the path from market category to platform and then listing type.</p>
        <div className="seller-flow-steps"><span className={form.rootCategoryId ? "done" : "active"}><b>1</b>Main category</span><span className={form.platformCategoryId ? "done" : form.rootCategoryId ? "active" : ""}><b>2</b>Platform</span><span className={form.listingTypeId || !listingTypes.length ? "done" : form.platformCategoryId ? "active" : ""}><b>3</b>Listing type</span></div>
        <label className={`seller-image-picker ${coverPreview ? "has-preview" : ""}`}>{coverPreview ? <img src={coverPreview} alt="Product preview" /> : <ImagePlus size={34} />}<span>Clear product image *</span><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /><small>{coverImage ? coverImage.name : "JPEG, PNG, or WebP · max 8 MB"}</small></label>
        <section className="seller-category-flow"><header><CheckCircle2 /><div><strong>Category path</strong><small>{selectedPath.length ? selectedPath.join(" → ") : "Choose where this product belongs"}</small></div></header><div className="form-grid three"><label><span>1. Main category</span><select required value={form.rootCategoryId} onChange={(event) => setForm({ ...form, rootCategoryId: event.target.value, platformCategoryId: "", listingTypeId: "" })}><option value="">Choose category</option>{rootCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label><span>2. Platform / subcategory</span><select required={platformCategories.length > 0} value={form.platformCategoryId} disabled={!platformCategories.length} onChange={(event) => setForm({ ...form, platformCategoryId: event.target.value, listingTypeId: "" })}><option value="">{platformCategories.length ? "Choose platform" : "No second level"}</option>{platformCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label><span>3. Listing type</span><select required={listingTypes.length > 0} value={form.listingTypeId} disabled={!listingTypes.length} onChange={(event) => setForm({ ...form, listingTypeId: event.target.value })}><option value="">{listingTypes.length ? "Choose New / Old / other" : "No third level"}</option>{listingTypes.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div></section>
        <div className="form-grid two"><label><span>Product title</span><input required minLength={3} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Instagram account setup service" /></label><label><span>Product type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="DOWNLOAD">Digital product</option><option value="SERVICE">Service</option></select></label><label><span>Price (USD)</span><input required type="number" min="0.50" step="0.01" value={form.priceUsd} onChange={(event) => setForm({ ...form, priceUsd: event.target.value })} /></label><label><span>Price (CNY)</span><input type="number" min="0" step="0.01" value={form.priceCny} onChange={(event) => setForm({ ...form, priceCny: event.target.value })} /></label><label><span>Price (RUB)</span><input type="number" min="0" step="0.01" value={form.priceRub} onChange={(event) => setForm({ ...form, priceRub: event.target.value })} /></label><label><span>After-sales hours</span><input required type="number" min={12} max={8760} value={form.afterSalesServiceHours} onChange={(event) => setForm({ ...form, afterSalesServiceHours: Number(event.target.value) })} /></label></div>
        <label><span>Short description</span><input required minLength={10} maxLength={240} value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} placeholder="A clear one-line summary buyers see in the catalog" /></label><label><span>Full description</span><textarea required minLength={30} rows={6} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label><span>Buyer delivery note</span><textarea rows={3} value={form.deliveryNote} onChange={(event) => setForm({ ...form, deliveryNote: event.target.value })} /></label><label><span>Digital inventory rows</span><textarea rows={5} placeholder="One license, code, or deliverable per line. You can also add these later." value={form.inventoryLines} onChange={(event) => setForm({ ...form, inventoryLines: event.target.value })} /></label><button className="primary-button seller-submit-product" disabled={busy}><PackagePlus /> {busy ? "Creating product…" : "Create product and send for review"}</button>
      </form></div> : null}
    </main>
  );
}
