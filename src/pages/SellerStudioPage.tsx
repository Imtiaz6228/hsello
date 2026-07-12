import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileUp, FolderPlus, ImagePlus, LogOut, PackagePlus, PlusCircle, Send, Store, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

type Category = { id: string; name: string; slug?: string; description?: string; parentId?: string | null };
type Product = {
  id: string;
  name: string;
  status: string;
  type: string;
  priceCents: number;
  priceUsdCents?: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  afterSalesServiceHours?: number;
  coverImageUrl?: string | null;
  rejectionReason?: string;
  category?: Category & { parent?: Category | null };
  files: Array<{ id: string; displayName: string; version: number; sizeBytes: number }>;
  inventoryItems: Array<{ id: string; deliveredAt?: string | null; isActive: boolean }>;
};

const initialForm = {
  categoryId: "",
  subCategoryId: "",
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

export function SellerStudioPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { formatMoney } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [form, setForm] = useState(initialForm);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", parentId: "" });

  const parentCategories = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const groupedCategoryOptions = useMemo(() => categories.map((category) => {
    const parent = category.parentId ? categoriesById.get(category.parentId) : null;
    return {
      ...category,
      label: parent ? `${parent.name} / ${category.name}` : category.name,
      isParent: !category.parentId
    };
  }).sort((a, b) => Number(a.isParent) - Number(b.isParent) || a.label.localeCompare(b.label)), [categories, categoriesById]);
  const selectedCategoryId = form.subCategoryId || form.categoryId;

  const load = () => Promise.all([
    apiRequest<{ products: Product[] }>("/api/seller/products"),
    apiRequest<{ categories: Category[] }>("/api/seller/categories")
  ]).then(([productsData, categoriesData]) => {
    setProducts(productsData.products);
    setCategories(categoriesData.categories);
    if (!form.categoryId && categoriesData.categories[0]) {
      setForm((current) => ({ ...current, categoryId: categoriesData.categories[0].id, subCategoryId: "" }));
    }
  });

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await apiRequest<{ category: Category; message?: string }>("/api/seller/categories", {
        method: "POST",
        body: {
          name: categoryForm.name,
          description: categoryForm.description,
          parentId: categoryForm.parentId || null,
          sortOrder: categoryForm.parentId ? 1000 : 900
        }
      });
      setCategoryOpen(false);
      setCategoryForm({ name: "", description: "", parentId: "" });
      setMessage(result.message ?? "Category added.");
      await load();
      setForm((current) => ({
        ...current,
        categoryId: result.category.id,
        subCategoryId: ""
      }));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Category could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const data = new FormData();
    data.append("categoryId", selectedCategoryId);
    data.append("name", form.name);
    data.append("shortDescription", form.shortDescription);
    data.append("description", form.description);
    data.append("type", form.type);
    data.append("priceUsdCents", String(cents(form.priceUsd)));
    data.append("priceCnyCents", String(cents(form.priceCny)));
    data.append("priceRubCents", String(cents(form.priceRub)));
    data.append("currency", "USD");
    data.append("deliveryNote", form.deliveryNote);
    data.append("afterSalesServiceHours", String(form.afterSalesServiceHours));
    data.append("downloadLimit", String(form.downloadLimit));
    data.append("downloadExpiryHours", String(form.downloadExpiryHours));
    data.append("buyersGetUpdates", String(form.buyersGetUpdates));
    data.append("inventoryLines", form.inventoryLines);
    data.append("seoTitle", form.name);
    data.append("seoDescription", form.shortDescription);
    if (coverImage) data.append("coverImage", coverImage);

    try {
      const result = await apiRequest<{ message?: string }>("/api/seller/products", { method: "POST", body: data });
      setOpen(false);
      setCoverImage(null);
      setForm((current) => ({ ...initialForm, categoryId: current.categoryId, subCategoryId: current.subCategoryId }));
      setMessage(result.message ?? "Product saved. Submit it for review when delivery is ready.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Product could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("coverImage", file);
    setMessage("Uploading product image...");
    try {
      await apiRequest(`/api/seller/products/${productId}/image`, { method: "POST", body: data });
      setMessage("Product image updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Image upload failed.");
    }
  }

  async function uploadDeliveryFile(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    setMessage("Uploading delivery file...");
    try {
      await apiRequest(`/api/seller/products/${productId}/files`, { method: "POST", body: data });
      setMessage("New delivery file uploaded. Submit the product for approval when ready.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "File upload failed.");
    }
  }

  async function uploadInventoryFile(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    setMessage("Uploading inventory rows...");
    try {
      const result = await apiRequest<{ count: number }>(`/api/seller/products/${productId}/inventory/file`, { method: "POST", body: data });
      setMessage(`${result.count} inventory row${result.count === 1 ? "" : "s"} added. Submit the product for approval when ready.`);
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Inventory upload failed.");
    }
  }

  async function addInventoryRows(productId: string) {
    const inventoryLines = window.prompt("Paste one digital product / code / account per line:");
    if (!inventoryLines?.trim()) return;
    try {
      const result = await apiRequest<{ count: number }>(`/api/seller/products/${productId}/inventory/manual`, { method: "POST", body: { inventoryLines } });
      setMessage(`${result.count} inventory row${result.count === 1 ? "" : "s"} added.`);
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Inventory rows could not be added.");
    }
  }

  async function submit(productId: string) {
    try {
      await apiRequest(`/api/seller/products/${productId}/submit`, { method: "POST" });
      setMessage("Product submitted for admin approval. It will show as pending until staff approves it.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Product could not be submitted.");
    }
  }

  async function signOut() {
    await logout();
    navigate("/");
  }

  return (
    <main className="seller-workspace">
      <Seo title="Seller studio" description="Manage HSello store products, files, review submissions, and digital delivery." />
      <nav>
        <Link to="/dashboard"><ArrowLeft /> Account</Link>
        <strong><Store /> Seller studio</strong>
        <div className="seller-nav-actions">
          <LocaleSwitcher />
          <button onClick={() => setCategoryOpen(true)}><FolderPlus /> New category</button>
          <button onClick={() => setOpen(true)}><PackagePlus /> New product</button>
          <button className="secondary-button" onClick={() => void signOut()}><LogOut /> Sign out</button>
        </div>
      </nav>
      <header>
        <span className="section-index">VERIFIED SELLER WORKSPACE</span>
        <h1>Seller dashboard.<br />Simple product submissions.</h1>
        <p>All your products are listed here. Add the buyer-facing title, description, category, price, image, and delivery file or ZIP, then submit for admin approval before buyers can purchase.</p>
      </header>
      {message ? <div className="dashboard-message">{message}</div> : null}
      <section className="seller-category-panel"><div><FolderPlus /><span><strong>Product categories</strong><small>Select from existing categories when creating a product. Add a simple category only when it is missing.</small></span></div><button type="button" onClick={() => setCategoryOpen(true)}><PlusCircle /> Add category</button></section>
      <section className="seller-product-list">
        <div className="seller-list-heading"><span>Product</span><span>Status</span><span>Delivery</span><span>Actions</span></div>
        {products.length ? products.map((product) => {
          const availableRows = product.inventoryItems.filter((item) => item.isActive && !item.deliveredAt).length;
          const deliveredRows = product.inventoryItems.filter((item) => item.deliveredAt).length;
          return (
            <article key={product.id}>
              <div>
                <span className="seller-product-mark">
                  {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" /> : product.name[0]}
                </span>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.category?.parent?.name ? `${product.category.parent.name} / ` : ""}{product.category?.name ?? product.type}</small>
                  <small>{formatMoney(product.priceUsdCents ?? product.priceCents)} · base USD ${(product.priceUsdCents ?? product.priceCents) / 100}</small>
                  <small>After-sales: {product.afterSalesServiceHours ?? 12}h minimum dispute window</small>
                  {product.rejectionReason ? <p>{product.rejectionReason}</p> : null}
                </div>
              </div>
              <span className={`status-pill ${product.status.toLowerCase()}`}>{product.status === "PENDING" ? "PENDING APPROVAL" : product.status}</span>
              <div className="file-versions">
                {product.files.length ? product.files.map((file) => <span key={file.id}>{file.displayName} <small>v{file.version}</small></span>) : null}
                {availableRows || deliveredRows ? <span>{availableRows} unsold rows <small>{deliveredRows} sold</small></span> : null}
                {!product.files.length && !availableRows && !deliveredRows ? <small>No delivery added</small> : null}
              </div>
              <div className="seller-product-actions">
                <label className="upload-action"><ImagePlus /> Product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(product.id, event.target.files?.[0])} /></label>
                <label className="upload-action"><Upload /> Delivery file<input type="file" onChange={(event) => void uploadDeliveryFile(product.id, event.target.files?.[0])} /></label>
                <label className="upload-action"><FileUp /> Inventory file<input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(event) => void uploadInventoryFile(product.id, event.target.files?.[0])} /></label>
                <button type="button" onClick={() => void addInventoryRows(product.id)}><PackagePlus /> Add rows</button>
                {!["PENDING", "APPROVED", "REMOVED"].includes(product.status) ? <button onClick={() => void submit(product.id)}><Send /> Submit review</button> : null}
              </div>
            </article>
          );
        }) : <div className="dashboard-empty"><FileUp /><h2>No products yet</h2><p>Create a product, add delivery rows or files, then submit it for admin approval.</p></div>}
      </section>


      {categoryOpen ? (
        <div className="modal-backdrop">
          <form className="seller-product-form seller-category-form" onSubmit={createCategory}>
            <button type="button" className="modal-close" onClick={() => setCategoryOpen(false)}>x</button>
            <span className="section-index">NEW CATEGORY</span>
            <h2>Add a buyer category.</h2>
            <p className="modal-helper">Create a parent category or choose a parent to create a subcategory. New categories appear in buyer browsing, product forms, and category filters.</p>
            <div className="form-grid two">
              <label><span>Category name</span><input required minLength={2} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="e.g. Instagram design packs" /></label>
              <label><span>Parent category</span><select value={categoryForm.parentId} onChange={(event) => setCategoryForm({ ...categoryForm, parentId: event.target.value })}><option value="">Create as parent category</option>{parentCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
            </div>
            <label><span>Description</span><textarea required minLength={12} rows={5} value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Explain what buyers will find in this category." /></label>
            <button className="primary-button" disabled={busy}><FolderPlus /> {busy ? "Creating..." : "Create category"}</button>
          </form>
        </div>
      ) : null}

      {open ? (
        <div className="modal-backdrop">
          <form className="seller-product-form" onSubmit={create}>
            <button type="button" className="modal-close" onClick={() => setOpen(false)}>x</button>
            <span className="section-index">NEW PRODUCT SUBMISSION</span>
            <h2>Create a product buyers can understand.</h2>
            <label className="seller-image-picker">
              <span>Product image</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCoverImage(event.target.files?.[0] ?? null)} />
              <small>{coverImage ? coverImage.name : "JPEG, PNG, or WebP"}</small>
            </label>
            <div className="form-grid two">
              <label><span>Product title shown to buyers</span><input required minLength={3} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Premium design template bundle" /></label>
              <label><span>Category</span><select required value={selectedCategoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value, subCategoryId: "" })}>{groupedCategoryOptions.map((category) => <option value={category.id} key={category.id}>{category.isParent ? category.label : `↳ ${category.label}`}</option>)}</select><button className="inline-form-link" type="button" onClick={() => setCategoryOpen(true)}>+ Add or request category</button></label>
              <label><span>Type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="DOWNLOAD">Digital product</option><option value="SERVICE">Service</option></select></label>
              <label><span>Price (USD)</span><input required type="number" min="0.50" step="0.01" value={form.priceUsd} onChange={(event) => setForm({ ...form, priceUsd: event.target.value })} /></label>
              <label><span>Price (Yuan / CNY)</span><input type="number" min="0" step="0.01" value={form.priceCny} onChange={(event) => setForm({ ...form, priceCny: event.target.value })} /></label>
              <label><span>Price (Russian Ruble)</span><input type="number" min="0" step="0.01" value={form.priceRub} onChange={(event) => setForm({ ...form, priceRub: event.target.value })} /></label>
              <label><span>After-sales service time (hours)</span><input required type="number" min={12} max={8760} value={form.afterSalesServiceHours} onChange={(event) => setForm({ ...form, afterSalesServiceHours: Number(event.target.value) })} /></label>
            </div>
            <label><span>Short description shown on product cards</span><input required minLength={10} maxLength={240} value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} placeholder="One clear sentence about what the buyer gets" /></label>
            <label><span>Full product description</span><textarea required minLength={30} rows={6} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explain features, what is included, compatibility, and delivery details." /></label>
            <label><span>Buyer delivery note</span><textarea rows={3} value={form.deliveryNote} onChange={(event) => setForm({ ...form, deliveryNote: event.target.value })} placeholder="Optional note shown beside the download after approval." /></label>
            <label><span>Manual digital product rows</span><textarea rows={6} placeholder="One product / code / account / license per line" value={form.inventoryLines} onChange={(event) => setForm({ ...form, inventoryLines: event.target.value })} /></label>
            <small>Tip: upload your finished delivery file as a ZIP from the product list after creating the product. Products stay hidden until admin approves them.</small>
            <button className="primary-button" disabled={busy}><PackagePlus /> {busy ? "Submitting..." : "Create product"}</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
