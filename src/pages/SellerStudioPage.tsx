import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3,
  Bell, Boxes, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Copy, CreditCard, Download,
  Eye, FileText, FileUp, FolderKanban, Gift, Grid3X3, ImageIcon, ImagePlus, KeyRound, LayoutDashboard, Layers3, LifeBuoy, LockKeyhole, LogOut,
  Megaphone, Menu, MessageSquare, MoreHorizontal, PackageCheck, PackagePlus, Palette,
  RefreshCw, Search, Send, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal,
  Sparkles, Store, Tag, TicketCheck, TrendingUp, Upload, Users, WalletCards, X
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiDownloadUrl, apiRequest, mediaUrl } from "../api/client";
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
  inventoryItems?: Array<{ id: string; content: string; source: string; deliveredAt?: string | null }>;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    buyer: { firstName: string; lastName: string; email: string };
    payment?: { status: string } | null;
  };
};

type Tab = "overview" | "products" | "product-groups" | "categories" | "inventory" | "downloads" | "drafts" | "orders" | "processing" | "delivered" | "refunds" | "disputes" | "finance" | "transactions" | "frozen" | "earnings" | "withdrawals" | "messages" | "tickets" | "notifications" | "coupons" | "promotions" | "sponsored" | "featured" | "analytics" | "revenue" | "visitors" | "conversion" | "storefront" | "payments" | "security" | "api" | "preferences" | "support";
type AnalyticsPeriod = "7d" | "30d" | "year";

const sellerTabs: Array<{ id: Tab; label: string; icon: typeof Store }> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Boxes },
  { id: "product-groups", label: "Product groups", icon: FolderKanban },
  { id: "categories", label: "Categories", icon: Grid3X3 },
  { id: "inventory", label: "Inventory", icon: Layers3 },
  { id: "downloads", label: "Uploaded files", icon: Download },
  { id: "drafts", label: "Drafts & review", icon: FileText },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "processing", label: "Processing orders", icon: Clock3 },
  { id: "delivered", label: "Delivered orders", icon: PackageCheck },
  { id: "refunds", label: "Refunds", icon: ArrowDownRight },
  { id: "disputes", label: "Disputes", icon: ShieldCheck },
  { id: "finance", label: "Financial center", icon: WalletCards },
  { id: "transactions", label: "Transactions", icon: FileText },
  { id: "frozen", label: "Frozen funds", icon: LockKeyhole },
  { id: "earnings", label: "Earnings", icon: TrendingUp },
  { id: "withdrawals", label: "Withdrawals", icon: CircleDollarSign },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "tickets", label: "Support tickets", icon: TicketCheck },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "promotions", label: "Promotions", icon: Gift },
  { id: "sponsored", label: "Sponsored listings", icon: Megaphone },
  { id: "featured", label: "Featured products", icon: Sparkles },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "revenue", label: "Revenue analytics", icon: TrendingUp },
  { id: "visitors", label: "Visitor analytics", icon: Users },
  { id: "conversion", label: "Conversion analytics", icon: ArrowUpRight },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "storefront", label: "Store profile", icon: Store },
  { id: "payments", label: "Payment methods", icon: CreditCard },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "api", label: "API access", icon: KeyRound },
  { id: "preferences", label: "Preferences", icon: Settings },
  { id: "support", label: "Seller support", icon: LifeBuoy }
];

const sellerMenuGroups: Array<{ label: string; items: Array<{ label: string; tab: Tab; icon: typeof Store }> }> = [
  { label: "Workspace", items: [{ label: "Dashboard", tab: "overview", icon: LayoutDashboard }] },
  { label: "Catalog", items: [
    { label: "My products", tab: "products", icon: Boxes },
    { label: "Categories", tab: "categories", icon: Grid3X3 },
    { label: "Inventory & variants", tab: "inventory", icon: Layers3 },
    { label: "Drafts & review", tab: "drafts", icon: FileText }
  ] },
  { label: "Orders", items: [
    { label: "All orders", tab: "orders", icon: ShoppingBag },
    { label: "Refunds", tab: "refunds", icon: ArrowDownRight },
    { label: "Disputes", tab: "disputes", icon: ShieldCheck }
  ] },
  { label: "Finance", items: [
    { label: "Financial center", tab: "finance", icon: WalletCards }
  ] },
  { label: "Inbox", items: [
    { label: "Buyer messages", tab: "messages", icon: MessageSquare },
    { label: "Support tickets", tab: "tickets", icon: TicketCheck },
    { label: "Notifications", tab: "notifications", icon: Bell }
  ] },
  { label: "Performance", items: [
    { label: "Analytics", tab: "analytics", icon: BarChart3 }
  ] },
  { label: "Store", items: [
    { label: "Store profile", tab: "storefront", icon: Store },
    { label: "Security", tab: "security", icon: ShieldCheck },
    { label: "Seller support", tab: "support", icon: LifeBuoy }
  ] }
];

type FinanceSummary = {
  availableBalanceCents: number;
  frozenBalanceCents: number;
  releasedSellerEarningsCents: number;
  totalSellerEarningsCents: number;
  totalSellerEarningCount: number;
  withdrawnCents: number;
  todayIncomeCents: number;
  todayOrderCount: number;
};

type Withdrawal = {
  id: string;
  amountCents: number;
  blockchain: string;
  walletAddress: string;
  status: string;
  providerReference?: string | null;
  createdAt: string;
};
type SellerTicket = { id: string; ticketNumber: string; subject: string; category: string; status: string; priority?: string; updatedAt: string; creator?: { firstName: string; email: string }; messages?: Array<{ id: string; body: string }> };

function MediaPreview({ src, alt, fallback }: { src?: string | null; alt: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed
    ? <img src={mediaUrl(src)} alt={alt} onError={() => setFailed(true)} />
    : <span className="seller-media-fallback"><ImageIcon /><b>{fallback}</b></span>;
}

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tickets, setTickets] = useState<SellerTicket[]>([]);
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: "", blockchain: "USDT TRC20", walletAddress: "" });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Workspace: true, Catalog: true, Orders: true, Finance: true, Inbox: true, Performance: true, Store: true });
  const [mediaUploading, setMediaUploading] = useState("");
  const [deliveryOrder, setDeliveryOrder] = useState<SellerOrder | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("7d");

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
  const deliveredOrders = orders.filter((item) => ["COMPLETED", "DELIVERED"].includes(item.order.status)).length;
  const pendingOrders = orders.length - deliveredOrders;
  const uniqueBuyers = new Set(orders.map((item) => item.order.buyer.email)).size;
  const averageOrderValue = orders.length ? Math.round(grossSales / orders.length) : 0;
  const filteredProducts = products.filter((product) => {
    const queryMatch = !searchQuery || `${product.name} ${categoryLabel(product.category)}`.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === "ALL" || product.status === statusFilter;
    return queryMatch && statusMatch;
  });
  const visibleProducts = filteredProducts.filter((product) => tab !== "drafts" || ["DRAFT", "PENDING", "REJECTED"].includes(product.status));
  const filteredOrders = orders.filter((item) => {
    const queryMatch = !searchQuery || `${item.productName} ${item.order.orderNumber} ${item.order.buyer.firstName} ${item.order.buyer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    if (!queryMatch) return false;
    if (tab === "processing") return ["PENDING", "PAID", "PROCESSING", "DISPUTED"].includes(item.order.status);
    if (tab === "delivered") return ["DELIVERED", "COMPLETED"].includes(item.order.status);
    if (tab === "refunds") return ["REFUNDED", "REFUND_REQUESTED"].includes(item.order.status);
    if (tab === "disputes") return item.order.status === "DISPUTED";
    return true;
  });
  const uploadedFiles = products.flatMap((product) => product.files.map((file) => ({ product, file })));
  const revenueChart = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(today);
    let bucketCount = 7;
    let bucketDays = 1;
    let labels: string[] = [];
    if (analyticsPeriod === "7d") {
      start = new Date(today.getTime() - 6 * dayMs);
      labels = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * dayMs).toLocaleDateString(undefined, { weekday: "short" }));
    } else if (analyticsPeriod === "30d") {
      start = new Date(today.getTime() - 29 * dayMs);
      bucketCount = 10;
      bucketDays = 3;
      labels = Array.from({ length: bucketCount }, (_, index) => new Date(start.getTime() + index * bucketDays * dayMs).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      bucketCount = 12;
      labels = Array.from({ length: 12 }, (_, index) => new Date(start.getFullYear(), start.getMonth() + index, 1).toLocaleDateString(undefined, { month: "short" }));
    }
    const values = Array.from({ length: bucketCount }, () => 0);
    const periodOrders = orders.filter((item) => {
      const created = new Date(item.order.createdAt);
      if (created < start) return false;
      const index = analyticsPeriod === "year"
        ? (created.getFullYear() - start.getFullYear()) * 12 + created.getMonth() - start.getMonth()
        : Math.floor((created.getTime() - start.getTime()) / (bucketDays * dayMs));
      if (index >= 0 && index < values.length) values[index] += item.totalCents;
      return index >= 0 && index < values.length;
    });
    const maximum = Math.max(1, ...values);
    return {
      labels,
      heights: values.map((value) => value ? Math.max(8, Math.round((value / maximum) * 100)) : 3),
      revenue: periodOrders.reduce((sum, item) => sum + item.totalCents, 0),
      orders: periodOrders.length
    };
  }, [analyticsPeriod, orders]);

  function showMessage(text: string, type: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function selectTab(next: Tab) {
    setTabState(next);
    setDrawerOpen(false);
    setSearchQuery("");
    setStatusFilter("ALL");
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
    const [productsData, categoriesData, profileData, ordersData, financeData, withdrawalData, ticketData] = await Promise.all([
      apiRequest<{ products: Product[] }>("/api/seller/products"),
      apiRequest<{ categories: Category[] }>("/api/seller/categories"),
      apiRequest<{ profile: SellerProfile }>("/api/seller/profile"),
      apiRequest<{ items: SellerOrder[] }>("/api/seller/orders"),
      apiRequest<{ summary: FinanceSummary }>("/api/seller/finance"),
      apiRequest<{ withdrawals: Withdrawal[] }>("/api/wallet/withdrawals"),
      apiRequest<{ tickets: SellerTicket[] }>("/api/seller/tickets")
    ]);
    setProducts(productsData.products);
    setCategories(categoriesData.categories);
    setOrders(ordersData.items);
    setFinance(financeData.summary);
    setWithdrawals(withdrawalData.withdrawals);
    setTickets(ticketData.tickets);
    setProfile(profileData.profile);
    setProfileForm({ about: profileData.profile?.about ?? "", policy: profileData.profile?.policy ?? "" });
    setForm((current) => {
      if (current.rootCategoryId) return current;
      const firstRoot = categoriesData.categories.find((category) => !category.parentId);
      return firstRoot ? { ...current, rootCategoryId: firstRoot.id } : current;
    });
  }, []);

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      await load();
      showMessage("Seller Center is up to date.", "success");
    } catch (error) {
      showMessage(errorText(error, "Seller data could not be refreshed."), "error");
    } finally {
      setRefreshing(false);
    }
  }

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
    setMediaUploading(`product:${productId}`);
    showMessage("Uploading product image…");
    try {
      await apiRequest(`/api/seller/products/${productId}/image`, { method: "POST", body: data });
      showMessage("Product image uploaded successfully.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Image upload failed."), "error");
    } finally {
      setMediaUploading("");
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
    setMediaUploading(`store:${kind}`);
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
      setMediaUploading("");
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

  async function requestWithdrawal(event: FormEvent) {
    event.preventDefault();
    const amountCents = cents(withdrawalForm.amount);
    if (amountCents < 500) return showMessage("Minimum withdrawal is $5.00.", "error");
    if (!withdrawalForm.walletAddress.trim()) return showMessage("Enter the receiving wallet address.", "error");
    setBusy(true);
    try {
      const result = await apiRequest<{ message?: string; withdrawal: Withdrawal }>("/api/wallet/withdrawals", {
        method: "POST",
        body: { amountCents, blockchain: withdrawalForm.blockchain, walletAddress: withdrawalForm.walletAddress.trim() }
      });
      setWithdrawals((current) => [result.withdrawal, ...current]);
      setWithdrawalForm({ ...withdrawalForm, amount: "", walletAddress: "" });
      showMessage(result.message ?? "Withdrawal request submitted.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Withdrawal request could not be submitted."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function replyToTicket(ticketId: string) {
    const body = window.prompt("Write your reply to this support ticket:");
    if (!body?.trim()) return;
    try {
      await apiRequest(`/api/seller/tickets/${ticketId}/reply`, { method: "POST", body: { body: body.trim() } });
      showMessage("Ticket reply sent.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Ticket reply could not be sent."), "error");
    }
  }

  return (
    <main className="seller-pro-dashboard">
      <Seo title="Seller studio" description="Manage your storefront, products, files, orders, and digital delivery." noIndex />
      {drawerOpen ? <button className="seller-drawer-backdrop" aria-label="Close menu" onClick={() => setDrawerOpen(false)} /> : null}
      <aside className={`seller-pro-sidebar ${drawerOpen ? "open" : ""}`}>
        <div className="seller-sidebar-head"><Link className="brand-lockup" to="/"><span className="brand-glyph">H</span><span><strong>HSELLO</strong><small>SELLER CENTER</small></span></Link><button aria-label="Close seller menu" onClick={() => setDrawerOpen(false)}><X /></button></div>
        <div className="seller-store-card">
          <span><MediaPreview src={profile?.logoUrl} alt={`${profile?.storeName ?? "Store"} logo`} fallback={(profile?.storeName ?? "Store").slice(0, 2).toUpperCase()} /></span>
          <div><strong>{profile?.storeName ?? "Your store"}</strong><small>{profile?.isVerified ? "Verified professional" : "Seller account"}</small></div>
          {profile?.isVerified ? <BadgeCheck size={17} /> : null}
        </div>
        <nav className="seller-premium-nav">{sellerMenuGroups.map((group) => <section key={group.label}><button className="seller-nav-group" type="button" onClick={() => setExpandedGroups({ ...expandedGroups, [group.label]: !expandedGroups[group.label] })}><span>{group.label}</span><ChevronDown className={expandedGroups[group.label] ? "rotated" : ""} /></button>{expandedGroups[group.label] ? <div>{group.items.map(({ label, tab: itemTab, icon: Icon }) => <button type="button" key={label} className={tab === itemTab ? "active" : ""} onClick={() => selectTab(itemTab)}><Icon size={17} /><span>{label}</span>{label === "Notifications" && pendingProducts > 0 ? <b>{pendingProducts}</b> : null}</button>)}</div> : null}</section>)}</nav>
        <div className="seller-sidebar-support"><LifeBuoy /><span><strong>Seller support</strong><small>Help whenever you need it</small></span><ArrowRight /></div>
        <div className="seller-pro-sidebar-footer"><Link to="/dashboard"><ArrowLeft size={16} /> Buyer account</Link><Link to="/sign-out"><LogOut size={16} /> Logout</Link></div>
      </aside>

      <section className="seller-pro-main">
        <header className="seller-pro-topbar">
          <div><button className="seller-mobile-menu" onClick={() => setDrawerOpen(true)} aria-label="Open seller menu"><Menu /></button><span>Seller center /</span><strong>{sellerTabs.find((item) => item.id === tab)?.label}</strong></div>
          <label className="seller-global-search"><Search /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products, orders, buyers…" /></label>
          <div><button className="seller-icon-button" onClick={() => selectTab("notifications")} aria-label="Notifications"><Bell />{pendingProducts > 0 ? <b>{pendingProducts}</b> : null}</button><LocaleSwitcher compact /><button className="seller-create-button" onClick={() => setOpen(true)}><PackagePlus size={17} /> Publish product</button></div>
        </header>
        <div className="seller-pro-heading"><div><span className="seller-live-pill"><i /> STORE DATA</span><h1>{tab === "overview" ? `Welcome back, ${profile?.storeName ?? "Seller"}` : sellerTabs.find((item) => item.id === tab)?.label}</h1><p>{tab === "overview" ? "Start with orders and listings that need attention, then review performance." : "Manage this area with focused tools and current marketplace records."}</p></div><button className="seller-refresh-button" onClick={() => void refreshDashboard()} disabled={refreshing}><RefreshCw className={refreshing ? "spinning" : ""} /> Refresh</button></div>
        {message ? <div className={`dashboard-message ${messageType}`}>{message}</div> : null}

        {tab === "overview" ? <>
          <section className="seller-balance-hero">
            <div><span>Available balance</span><strong>{formatMoney(finance?.availableBalanceCents ?? 0)}</strong><p><ArrowUpRight /> {finance?.todayIncomeCents ? formatMoney(finance.todayIncomeCents) : "$0.00"} earned today</p></div>
            <div className="seller-balance-actions"><button onClick={() => selectTab("withdrawals")}><CircleDollarSign /> Withdraw funds</button><button onClick={() => selectTab("finance")}><FileText /> View transactions</button></div>
            <span className="seller-balance-orb"><Sparkles /></span>
          </section>
          <section className="seller-metric-grid seller-metric-grid-premium">
            <button type="button" className="seller-metric-action" onClick={() => selectTab("finance")}><span><TrendingUp /></span><div><small>Today’s revenue</small><strong>{formatMoney(finance?.todayIncomeCents ?? 0)}</strong><p className="positive"><ArrowUpRight /> Current total</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("earnings")}><span><WalletCards /></span><div><small>Lifetime earnings</small><strong>{formatMoney(finance?.totalSellerEarningsCents ?? grossSales)}</strong><p className="positive"><ArrowUpRight /> All-time total</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("processing")}><span><ShoppingBag /></span><div><small>Pending orders</small><strong>{pendingOrders}</strong><p><Clock3 /> Requires attention</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("delivered")}><span><PackageCheck /></span><div><small>Completed orders</small><strong>{deliveredOrders}</strong><p className="positive"><ArrowUpRight /> Successful delivery</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("products")}><span><Boxes /></span><div><small>Published products</small><strong>{liveProducts}</strong><p>{pendingProducts} awaiting review</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("orders")}><span><Users /></span><div><small>Unique buyers</small><strong>{uniqueBuyers}</strong><p>Across {orders.length} orders</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("analytics")}><span><BadgeCheck /></span><div><small>Average rating</small><strong>{Number(profile?.averageRating ?? 0).toFixed(1)}</strong><p className="positive">Buyer feedback</p></div></button>
            <button type="button" className="seller-metric-action" onClick={() => selectTab("frozen")}><span><LockKeyhole /></span><div><small>Frozen balance</small><strong>{formatMoney(finance?.frozenBalanceCents ?? 0)}</strong><p>Releases automatically</p></div></button>
          </section>
          <section className="seller-performance-grid">
            <article className="seller-chart-card"><header><div><span>Performance</span><h2>Revenue overview</h2></div><div><button type="button" className={analyticsPeriod === "7d" ? "active" : ""} aria-pressed={analyticsPeriod === "7d"} onClick={() => setAnalyticsPeriod("7d")}>7 days</button><button type="button" className={analyticsPeriod === "30d" ? "active" : ""} aria-pressed={analyticsPeriod === "30d"} onClick={() => setAnalyticsPeriod("30d")}>30 days</button><button type="button" className={analyticsPeriod === "year" ? "active" : ""} aria-pressed={analyticsPeriod === "year"} onClick={() => setAnalyticsPeriod("year")}>Year</button></div></header><div className="seller-chart-summary"><span><i className="blue" /> Revenue <strong>{formatMoney(revenueChart.revenue)}</strong></span><span><i className="green" /> Orders <strong>{revenueChart.orders}</strong></span></div><div className="seller-css-chart">{revenueChart.heights.map((height, index) => <span key={`${analyticsPeriod}-${index}`} title={`${revenueChart.labels[index]}: ${height}%`} style={{ height: `${height}%` }}><i /></span>)}</div><footer>{revenueChart.labels.map((label) => <span key={label}>{label}</span>)}</footer></article>
            <article className="seller-quick-panel"><header><div><span>Shortcuts</span><h2>Quick actions</h2></div><MoreHorizontal /></header><button onClick={() => setOpen(true)}><span><PackagePlus /></span><div><strong>Publish a product</strong><small>Create a polished new listing</small></div><ArrowRight /></button><button onClick={() => selectTab("orders")}><span><ShoppingBag /></span><div><strong>Manage orders</strong><small>{pendingOrders} orders need attention</small></div><ArrowRight /></button><button onClick={() => selectTab("withdrawals")}><span><CircleDollarSign /></span><div><strong>Withdraw balance</strong><small>{formatMoney(finance?.availableBalanceCents ?? 0)} available</small></div><ArrowRight /></button><button onClick={() => selectTab("storefront")}><span><Palette /></span><div><strong>Polish storefront</strong><small>Logo, banner and policy</small></div><ArrowRight /></button></article>
          </section>
          <section className="seller-recent-card"><header><div><span>Latest activity</span><h2>Recent orders</h2></div><button onClick={() => selectTab("orders")}>View all <ArrowRight /></button></header>{orders.slice(0, 4).length ? <div>{orders.slice(0, 4).map((item) => <article key={item.id}><span className="seller-order-avatar">{item.order.buyer.firstName[0]}{item.order.buyer.lastName[0]}</span><div><strong>{item.productName}</strong><small>{item.order.orderNumber} · {item.order.buyer.firstName} {item.order.buyer.lastName}</small></div><b>{formatMoney(item.totalCents)}</b><span className={`status-pill ${item.order.status.toLowerCase()}`}>{item.order.status.replaceAll("_", " ")}</span><Link to={`/orders/${item.order.id}`} aria-label="Open order"><ArrowRight /></Link></article>)}</div> : <div className="dashboard-empty compact"><ShoppingBag /><h2>No orders yet</h2><p>Your newest orders will appear here.</p></div>}</section>
        </> : null}

        {tab === "product-groups" ? <section className="seller-collection-page"><header className="seller-table-toolbar"><div><h2>Product groups</h2><p>Organize listings into clear buyer-friendly collections</p></div><div><button onClick={() => setOpen(true)}><PackagePlus /> Add product</button></div></header><div className="seller-collection-grid">{rootCategories.map((category) => { const count = products.filter((product) => categoryLabel(product.category).startsWith(category.name)).length; return <article key={category.id}><span><FolderKanban /></span><div><small>COLLECTION</small><h3>{category.name}</h3><p>{count} product{count === 1 ? "" : "s"}</p></div><button onClick={() => selectTab("products")}>View listings <ArrowRight /></button></article>; })}{!rootCategories.length ? <div className="dashboard-empty"><FolderKanban /><h2>No product groups yet</h2><p>Groups will appear from your active marketplace categories.</p></div> : null}</div></section> : null}

        {tab === "categories" ? <section className="seller-category-page"><header className="seller-table-toolbar"><div><h2>Marketplace categories</h2><p>Use the approved category path when publishing a product</p></div><div><label><Search /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search categories" /></label></div></header><div className="seller-category-cards">{rootCategories.filter((category) => !searchQuery || category.name.toLowerCase().includes(searchQuery.toLowerCase())).map((root) => <article key={root.id}><header><span><Grid3X3 /></span><div><small>MAIN CATEGORY</small><h3>{root.name}</h3></div></header><div>{categories.filter((category) => category.parentId === root.id).map((child) => <span key={child.id}>{child.name}<b>{categories.filter((item) => item.parentId === child.id).length}</b></span>)}</div><button onClick={() => setOpen(true)}>Publish in this category <ArrowRight /></button></article>)}</div></section> : null}

        {["products", "inventory", "drafts"].includes(tab) ? <section className="seller-product-list seller-pro-products">
          <header className="seller-table-toolbar"><div><h2>{tab === "inventory" ? "Inventory & variants" : tab === "drafts" ? "Drafts and review queue" : "Product catalog"}</h2><p>{tab === "inventory" ? "Manage delivery files, codes and available stock" : tab === "drafts" ? `${visibleProducts.length} listings need work or review` : `${products.length} products · ${liveProducts} published`}</p></div><div><label><Search /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="APPROVED">Published</option><option value="PENDING">Pending review</option><option value="DRAFT">Draft</option><option value="REJECTED">Rejected</option></select><button onClick={() => setOpen(true)}><PackagePlus /> Add product</button></div></header>
          <div className="seller-list-heading"><span>Product</span><span>Status</span><span>Delivery</span><span>Actions</span></div>
          {visibleProducts.length ? visibleProducts.map((product) => {
            const availableRows = product.inventoryItems.filter((item) => item.isActive && !item.deliveredAt).length;
            const deliveredRows = product.inventoryItems.filter((item) => item.deliveredAt).length;
            return <article key={product.id}>
              <div className="seller-product-identity"><div className="seller-product-cover"><MediaPreview src={product.coverImageUrl} alt={product.name} fallback={product.name.slice(0, 2).toUpperCase()} /><label className={mediaUploading === `product:${product.id}` ? "uploading" : ""}><ImagePlus />{mediaUploading === `product:${product.id}` ? "Uploading…" : "Replace image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(mediaUploading)} onChange={(event) => void uploadImage(product.id, event.target.files?.[0])} /></label></div><div className="seller-product-copy"><strong>{product.name}</strong><small>{categoryLabel(product.category)}</small><div><b>{formatMoney(product.priceUsdCents ?? product.priceCents)}</b><span>After-sales {product.afterSalesServiceHours ?? 12}h</span></div>{product.rejectionReason ? <p>{product.rejectionReason}</p> : null}</div></div>
              <span className={`status-pill ${product.status.toLowerCase()}`}>{product.status.replaceAll("_", " ")}</span>
              <div className="file-versions">{product.files.map((file) => <span key={file.id}>{file.displayName} <small>v{file.version}</small></span>)}{availableRows || deliveredRows ? <span>{availableRows} available <small>{deliveredRows} delivered</small></span> : null}{!product.files.length && !availableRows && !deliveredRows ? <small>No delivery added</small> : null}</div>
              <div className="seller-product-actions"><label className="upload-action"><Upload /> Delivery file<input type="file" onChange={(event) => void uploadDeliveryFile(product.id, event.target.files?.[0])} /></label><label className="upload-action"><FileUp /> Inventory file<input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(event) => void uploadInventoryFile(product.id, event.target.files?.[0])} /></label><button type="button" onClick={() => void addInventoryRows(product.id)}><PackagePlus /> Add rows</button>{!["PENDING", "APPROVED", "REMOVED"].includes(product.status) ? <button onClick={() => void submit(product.id)}><Send /> Submit review</button> : null}</div>
            </article>;
          }) : <div className="dashboard-empty"><FileUp /><h2>{products.length ? "No matching products" : "No products yet"}</h2><p>{products.length ? "Try another search or status filter." : "Create your first listing with a product image and the full admin-managed category path."}</p>{!products.length ? <button className="primary-button" onClick={() => setOpen(true)}>Create product</button> : null}</div>}
        </section> : null}

        {tab === "downloads" ? <section className="seller-uploaded-library">
          <header className="seller-table-toolbar"><div><h2>Uploaded product files</h2><p>Download and verify the files currently attached to your products.</p></div><div><button onClick={() => selectTab("products")}><Upload /> Upload another file</button></div></header>
          {uploadedFiles.length ? <div className="seller-uploaded-grid">{uploadedFiles.map(({ product, file }) => <article key={file.id}><span><FileText /></span><div><small>{product.name}</small><strong>{file.displayName}</strong><p>Version {file.version} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</p></div><a href={apiDownloadUrl(`/api/seller/files/${file.id}/download`)}><Download /> Download</a></article>)}</div> : <div className="dashboard-empty"><Download /><h2>No uploaded files</h2><p>Add a delivery file to one of your products and it will appear here.</p><button className="primary-button" onClick={() => selectTab("products")}>Open products</button></div>}
        </section> : null}

        {["orders", "processing", "delivered", "refunds", "disputes"].includes(tab) ? <section className="seller-orders-shell"><header className="seller-table-toolbar"><div><h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2><p>Track payment, delivery, refunds and buyer communication</p></div><div><label><Search /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Order, buyer or product" /></label><button className="secondary"><SlidersHorizontal /> Filters</button><button className="secondary"><Download /> Export</button></div></header><div className="seller-order-tabs"><button className={tab === "orders" ? "active" : ""} onClick={() => selectTab("orders")}>All <b>{orders.length}</b></button><button className={tab === "processing" ? "active" : ""} onClick={() => selectTab("processing")}>Processing <b>{pendingOrders}</b></button><button className={tab === "delivered" ? "active" : ""} onClick={() => selectTab("delivered")}>Delivered <b>{deliveredOrders}</b></button><button className={tab === "refunds" ? "active" : ""} onClick={() => selectTab("refunds")}>Refunds <b>{orders.filter((item) => item.order.status.includes("REFUND")).length}</b></button><button className={tab === "disputes" ? "active" : ""} onClick={() => selectTab("disputes")}>Disputes <b>{orders.filter((item) => item.order.status === "DISPUTED").length}</b></button></div><section className="seller-orders-grid">{filteredOrders.length ? filteredOrders.map((item) => <article key={item.id}><header><span>{item.productName.slice(0, 2).toUpperCase()}</span><div><strong>{item.productName}</strong><small>{item.order.orderNumber} · {new Date(item.order.createdAt).toLocaleDateString()}</small></div><b>{item.order.status.replaceAll("_", " ")}</b></header><div><span><small>Buyer</small><strong>{item.order.buyer.firstName} {item.order.buyer.lastName}</strong></span><span><small>Quantity</small><strong>{item.quantity}</strong></span><span><small>Total</small><strong>{formatMoney(item.totalCents)}</strong></span><span><small>Payment</small><strong>{item.order.payment?.status ?? "Pending"}</strong></span></div><footer>{item.inventoryItems?.length ? <button type="button" onClick={() => setDeliveryOrder(item)}><Eye size={15} /> View delivery <b>{item.inventoryItems.length}</b></button> : null}<Link to={`/orders/${item.order.id}`}><MessageSquare size={15} /> Buyer chat <ArrowRight size={14} /></Link></footer></article>) : <div className="dashboard-empty"><ShoppingBag /><h2>No {tab === "orders" ? "seller orders" : tab} found</h2><p>This status is clear right now.</p></div>}</section></section> : null}

        {["finance", "transactions", "frozen", "earnings"].includes(tab) ? <>
          <section className="seller-finance-grid">
            <article className="primary"><span><WalletCards /></span><div><small>Available balance</small><strong>{formatMoney(finance?.availableBalanceCents ?? 0)}</strong><p>Ready to withdraw</p></div><button onClick={() => selectTab("withdrawals")}>Withdraw <ArrowRight /></button></article>
            <article><span><LockKeyhole /></span><div><small>Frozen balance</small><strong>{formatMoney(finance?.frozenBalanceCents ?? 0)}</strong><p>Protected during hold period</p></div></article>
            <article><span><TrendingUp /></span><div><small>Lifetime earnings</small><strong>{formatMoney(finance?.totalSellerEarningsCents ?? 0)}</strong><p>{finance?.totalSellerEarningCount ?? 0} earning records</p></div></article>
            <article><span><ArrowDownRight /></span><div><small>Withdrawn</small><strong>{formatMoney(finance?.withdrawnCents ?? 0)}</strong><p>Paid and pending requests</p></div></article>
          </section>
          <section className="seller-finance-layout"><article className="seller-chart-card"><header><div><span>Earnings</span><h2>Income activity</h2></div><button className="seller-export"><Download /> Export</button></header><div className="seller-finance-summary"><strong>{formatMoney(finance?.todayIncomeCents ?? 0)}</strong><span>Today’s net income</span></div><div className="seller-css-chart finance">{[42,30,58,48,72,54,88,68,92,75,96,84].map((height, index) => <span key={index} style={{ height: `${height}%` }}><i /></span>)}</div></article><article className="seller-frozen-card"><header><span><ShieldCheck /></span><div><h2>Frozen funds protection</h2><p>Funds are released automatically after the marketplace safety hold.</p></div></header><div><span>Currently frozen</span><strong>{formatMoney(finance?.frozenBalanceCents ?? 0)}</strong></div><ol><li className="done"><i />Payment received</li><li className="active"><i />Buyer protection hold</li><li><i />Available to withdraw</li></ol></article></section>
          <section className="seller-transaction-card"><header><div><span>Activity log</span><h2>Recent finance activity</h2></div><button><Download /> Export CSV</button></header>{withdrawals.length ? withdrawals.slice(0, 8).map((item) => <article key={item.id}><span className="transaction-icon"><ArrowUpRight /></span><div><strong>Withdrawal request</strong><small>{item.providerReference ?? item.id.slice(0, 10)} · {new Date(item.createdAt).toLocaleDateString()}</small></div><b>-{formatMoney(item.amountCents)}</b><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></article>) : <div className="dashboard-empty compact"><FileText /><h2>No transactions yet</h2><p>Your balance activity will appear here.</p></div>}</section>
        </> : null}

        {tab === "withdrawals" ? <section className="seller-withdraw-layout"><form className="seller-withdraw-card" onSubmit={requestWithdrawal}><header><span><CircleDollarSign /></span><div><h2>Withdraw funds</h2><p>Send your available balance to a verified wallet.</p></div></header><div className="seller-available-strip"><span>Available to withdraw</span><strong>{formatMoney(finance?.availableBalanceCents ?? 0)}</strong></div><label><span>Withdrawal network</span><select value={withdrawalForm.blockchain} onChange={(event) => setWithdrawalForm({ ...withdrawalForm, blockchain: event.target.value })}><option>USDT TRC20</option><option>USDT BEP20</option><option>USDT ERC20</option><option>Bitcoin</option><option>Ethereum</option></select></label><label><span>Amount (USD)</span><div className="amount-input"><b>$</b><input required type="number" min="5" step="0.01" value={withdrawalForm.amount} onChange={(event) => setWithdrawalForm({ ...withdrawalForm, amount: event.target.value })} placeholder="0.00" /><button type="button" onClick={() => setWithdrawalForm({ ...withdrawalForm, amount: ((finance?.availableBalanceCents ?? 0) / 100).toFixed(2) })}>MAX</button></div></label><label><span>Receiving wallet address</span><input required minLength={12} value={withdrawalForm.walletAddress} onChange={(event) => setWithdrawalForm({ ...withdrawalForm, walletAddress: event.target.value })} placeholder="Paste wallet address" /></label><div className="seller-fee-preview"><span>Requested amount <b>{formatMoney(cents(withdrawalForm.amount))}</b></span><span>Platform fee <b>$0.00</b></span><span>Net amount <strong>{formatMoney(cents(withdrawalForm.amount))}</strong></span></div><button className="seller-withdraw-submit" disabled={busy}><ShieldCheck /> {busy ? "Submitting…" : "Review withdrawal"}</button><small className="seller-secure-note"><LockKeyhole /> Protected by account security and admin approval</small></form><article className="seller-withdraw-history"><header><div><span>History</span><h2>Recent withdrawals</h2></div><button><SlidersHorizontal /></button></header>{withdrawals.length ? withdrawals.map((item) => <div key={item.id}><span><ArrowUpRight /></span><div><strong>{formatMoney(item.amountCents)}</strong><small>{item.blockchain} · {new Date(item.createdAt).toLocaleDateString()}</small></div><b className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</b></div>) : <div className="dashboard-empty"><CircleDollarSign /><h2>No withdrawals yet</h2><p>Your submitted requests will appear here with live status.</p></div>}</article></section> : null}

        {tab === "tickets" ? <section className="seller-ticket-center"><header className="seller-table-toolbar"><div><h2>Support tickets</h2><p>Order-linked support conversations and priority status</p></div><div><label><Search /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tickets" /></label><Link to="/support"><LifeBuoy /> Support center</Link></div></header>{tickets.filter((ticket) => !searchQuery || `${ticket.ticketNumber} ${ticket.subject}`.toLowerCase().includes(searchQuery.toLowerCase())).length ? <div>{tickets.filter((ticket) => !searchQuery || `${ticket.ticketNumber} ${ticket.subject}`.toLowerCase().includes(searchQuery.toLowerCase())).map((ticket) => <article key={ticket.id}><span className="seller-ticket-icon"><TicketCheck /></span><div><small>{ticket.ticketNumber} · {ticket.category.replaceAll("_", " ")}</small><h3>{ticket.subject}</h3><p>{ticket.creator?.firstName ?? "Buyer"} · {ticket.messages?.length ?? 0} messages · Updated {new Date(ticket.updatedAt).toLocaleDateString()}</p></div><b className={`status-pill ${ticket.status.toLowerCase()}`}>{ticket.status}</b><button onClick={() => void replyToTicket(ticket.id)}>Reply <ArrowRight /></button></article>)}</div> : <div className="dashboard-empty"><TicketCheck /><h2>No support tickets</h2><p>Buyer order tickets will appear here.</p></div>}</section> : null}

        {["coupons", "promotions", "sponsored", "featured"].includes(tab) ? <section className="seller-marketing-center"><header><div><span>SELLER MARKETING</span><h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2><p>Create visibility and conversion campaigns around your approved products.</p></div><button onClick={() => selectTab("products")}><Boxes /> Select products</button></header><div className="seller-marketing-summary"><article><Tag /><span><small>Active coupons</small><strong>0</strong></span></article><article><Gift /><span><small>Running promotions</small><strong>0</strong></span></article><article><Megaphone /><span><small>Sponsored listings</small><strong>0</strong></span></article><article><Sparkles /><span><small>Featured products</small><strong>{products.filter((product) => product.status === "APPROVED").slice(0, 3).length}</strong></span></article></div><div className="seller-campaign-builder"><div><span><Megaphone /></span><h3>Build your first {tab === "coupons" ? "coupon" : tab === "promotions" ? "promotion" : tab === "sponsored" ? "sponsored campaign" : "featured collection"}</h3><p>Choose an approved product, define the offer, schedule dates, and review the campaign before publishing.</p></div><div className="seller-campaign-steps"><span className="active"><b>1</b>Choose product</span><span><b>2</b>Offer details</span><span><b>3</b>Schedule</span><span><b>4</b>Review</span></div><div className="seller-campaign-products">{products.filter((product) => product.status === "APPROVED").slice(0, 4).map((product) => <button key={product.id}><span><MediaPreview src={product.coverImageUrl} alt={product.name} fallback={product.name.slice(0, 2)} /></span><div><strong>{product.name}</strong><small>{formatMoney(product.priceUsdCents ?? product.priceCents)}</small></div><ArrowRight /></button>)}{!products.some((product) => product.status === "APPROVED") ? <div className="dashboard-empty compact"><Megaphone /><h2>No eligible products</h2><p>Publish and approve a product before creating a campaign.</p></div> : null}</div></div></section> : null}

        {tab === "analytics" ? <><section className="seller-analytics-grid"><article><span><TrendingUp /></span><small>Total revenue</small><strong>{formatMoney(grossSales)}</strong><p className="positive"><ArrowUpRight /> Store performance</p></article><article><span><ShoppingBag /></span><small>Orders</small><strong>{orders.length}</strong><p>{deliveredOrders} completed</p></article><article><span><Users /></span><small>Customers</small><strong>{uniqueBuyers}</strong><p>Unique buyers</p></article><article><span><CircleDollarSign /></span><small>Average order</small><strong>{formatMoney(averageOrderValue)}</strong><p>Per checkout</p></article></section><section className="seller-analytics-layout"><article className="seller-chart-card"><header><div><span>Sales intelligence</span><h2>Performance trend</h2></div><div><button className="active">Revenue</button><button>Orders</button><button>Visitors</button></div></header><div className="seller-chart-summary"><span><i className="blue" /> Current period <strong>{formatMoney(grossSales)}</strong></span><span><i className="green" /> Conversion <strong>{products.length ? `${Math.min(100, Math.round((orders.length / Math.max(products.length, 1)) * 10))}%` : "0%"}</strong></span></div><div className="seller-css-chart analytics">{[18,34,29,48,42,64,58,73,69,86,78,94,88,98].map((height, index) => <span key={index} style={{ height: `${height}%` }}><i /></span>)}</div></article><article className="seller-top-products"><header><span>Products</span><h2>Top performers</h2></header>{products.slice(0, 5).map((product, index) => <div key={product.id}><b>{String(index + 1).padStart(2, "0")}</b><span className="seller-product-mini">{product.coverImageUrl ? <img src={product.coverImageUrl} alt="" /> : product.name[0]}</span><div><strong>{product.name}</strong><small>{categoryLabel(product.category)}</small></div><span className={`status-pill ${product.status.toLowerCase()}`}>{product.status}</span></div>)}{!products.length ? <div className="dashboard-empty compact"><BarChart3 /><h2>No product data</h2><p>Product performance will appear here.</p></div> : null}</article></section></> : null}

        {tab === "notifications" ? <section className="seller-notification-center"><header><div><span>Updates</span><h2>Notification center</h2><p>Important account, product and order activity in one place.</p></div><button>Mark all as read</button></header><h3>Today</h3>{pendingProducts > 0 ? <article className="warning"><span><Clock3 /></span><div><strong>{pendingProducts} product{pendingProducts === 1 ? " is" : "s are"} awaiting review</strong><p>You’ll be notified when marketplace review is complete.</p><small>Just now</small></div><i /></article> : null}{pendingOrders > 0 ? <article><span><ShoppingBag /></span><div><strong>{pendingOrders} order{pendingOrders === 1 ? " needs" : "s need"} your attention</strong><p>Open order management to review delivery and buyer messages.</p><small>Today</small></div><i /></article> : null}<article className="success"><span><BadgeCheck /></span><div><strong>Your seller workspace is protected</strong><p>Store verification and secure payment controls are active.</p><small>Today</small></div></article><h3>Earlier</h3><article><span><Sparkles /></span><div><strong>Welcome to the new Seller Center</strong><p>Your tools now live in a faster, mobile-first workspace.</p><small>Account update</small></div></article>{!pendingProducts && !pendingOrders ? <div className="seller-all-caught"><CheckCircle2 /><strong>You’re all caught up</strong><p>No urgent actions are waiting.</p></div> : null}</section> : null}

        {tab === "messages" ? <section className="seller-message-center"><header><div><span className="section-index">ORDER INBOX</span><h2>Buyer conversations</h2><p>Chats are tied to real orders, keeping delivery and dispute history protected.</p></div><span>{orders.length} conversations</span></header>{orders.length ? <div>{orders.map((item) => <Link to={`/orders/${item.order.id}`} key={item.id}><span>{item.order.buyer.firstName[0]}{item.order.buyer.lastName[0]}</span><div><strong>{item.order.buyer.firstName} {item.order.buyer.lastName}</strong><small>{item.productName} · {item.order.orderNumber}</small></div><b className={`status-pill ${item.order.status.toLowerCase()}`}>{item.order.status.replaceAll("_", " ")}</b><ArrowRight /></Link>)}</div> : <div className="dashboard-empty"><MessageSquare /><h2>No conversations yet</h2><p>Buyer chats become available as soon as you receive an order.</p></div>}</section> : null}

        {tab === "storefront" ? <section className="seller-branding-layout">
          <article className="seller-brand-preview" style={profile?.bannerUrl ? { backgroundImage: `linear-gradient(135deg, rgba(8,18,45,.8), rgba(29,78,216,.5)), url(${mediaUrl(profile.bannerUrl)})` } : undefined}><span><MediaPreview src={profile?.logoUrl} alt="Store logo" fallback={(profile?.storeName ?? "Store").slice(0, 2).toUpperCase()} /></span><div><small>PUBLIC STOREFRONT</small><h2>{profile?.storeName}</h2><p>{profile?.about}</p><b>{profile?.isVerified ? "✓ Verified seller" : "Seller"}</b></div></article>
          <form className="seller-brand-form" onSubmit={saveProfile}><header><span><Store /></span><div><h2>Store media & identity</h2><p>Upload professional images with an instant preview. JPEG, PNG and WebP are supported.</p></div></header><div className="seller-media-upload-grid"><label className={mediaUploading === "store:logo" ? "uploading" : ""}><span><MediaPreview src={profile?.logoUrl} alt="Current store logo" fallback="LOGO" /></span><strong>{mediaUploading === "store:logo" ? "Uploading logo…" : profile?.logoUrl ? "Replace store logo" : "Upload store logo"}</strong><small>Square image · recommended 800 × 800 · max 8 MB</small><b><ImagePlus /> Choose image</b><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(mediaUploading)} onChange={(event) => void uploadStoreMedia("logo", event.target.files?.[0])} /></label><label className={mediaUploading === "store:banner" ? "uploading" : ""}><span className="wide"><MediaPreview src={profile?.bannerUrl} alt="Current store banner" fallback="BANNER" /></span><strong>{mediaUploading === "store:banner" ? "Uploading banner…" : profile?.bannerUrl ? "Replace store banner" : "Upload store banner"}</strong><small>Wide image · recommended 1600 × 500 · max 8 MB</small><b><ImagePlus /> Choose image</b><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(mediaUploading)} onChange={(event) => void uploadStoreMedia("banner", event.target.files?.[0])} /></label></div><label><span>About your store</span><textarea required minLength={20} rows={6} value={profileForm.about} onChange={(event) => setProfileForm({ ...profileForm, about: event.target.value })} /></label><label><span>Store policy</span><textarea rows={5} value={profileForm.policy} onChange={(event) => setProfileForm({ ...profileForm, policy: event.target.value })} placeholder="Delivery, support and refund expectations" /></label><button className="primary-button" disabled={busy}><Store /> {busy ? "Saving…" : "Save storefront"}</button></form>
        </section> : null}

        {["revenue", "visitors", "conversion"].includes(tab) ? <section className="seller-insight-detail">
          <header><div><span>ANALYTICS</span><h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2><p>Live performance signals calculated from your current products and orders.</p></div><button type="button"><Download /> Export report</button></header>
          <div className="seller-insight-metrics"><article><TrendingUp /><small>Gross revenue</small><strong>{formatMoney(grossSales)}</strong><span>Across {orders.length} orders</span></article><article><Users /><small>Unique buyers</small><strong>{uniqueBuyers}</strong><span>Buyer accounts reached</span></article><article><ArrowUpRight /><small>Conversion signal</small><strong>{products.length ? `${Math.min(100, Math.round((orders.length / Math.max(products.length, 1)) * 10))}%` : "0%"}</strong><span>Orders per active listing</span></article><article><CircleDollarSign /><small>Average order</small><strong>{formatMoney(averageOrderValue)}</strong><span>Average checkout value</span></article></div>
          <article className="seller-insight-chart"><div><span>{tab === "visitors" ? "VISITOR TREND" : tab === "conversion" ? "CONVERSION TREND" : "REVENUE TREND"}</span><h3>Performance over time</h3></div><div className="seller-css-chart analytics">{[22,31,28,46,52,43,61,68,59,77,73,86,82,96].map((height, index) => <span key={index} style={{ height: `${height}%` }}><i /></span>)}</div></article>
        </section> : null}

        {["payments", "security", "api", "preferences", "support"].includes(tab) ? <section className="seller-settings-center">
          <header><div><span>SELLER SETTINGS</span><h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2><p>Manage your professional seller workspace without changing existing account workflows.</p></div><ShieldCheck /></header>
          {tab === "payments" ? <div className="seller-settings-grid"><article><span><WalletCards /></span><div><small>Marketplace balance</small><h3>Seller wallet</h3><p>Sales earnings, frozen funds and withdrawals are managed in Financial Center.</p></div><button onClick={() => selectTab("finance")}>Open finance <ArrowRight /></button></article><article><span><CreditCard /></span><div><small>Payout network</small><h3>Crypto withdrawals</h3><p>Submit a verified wallet and network when you request a withdrawal.</p></div><button onClick={() => selectTab("withdrawals")}>Manage <ArrowRight /></button></article></div> : null}
          {tab === "security" ? <div className="seller-security-panel"><article><BadgeCheck /><div><h3>Store verification</h3><p>{profile?.isVerified ? "Your seller identity is verified." : "Verification is pending review."}</p></div><b className={`status-pill ${profile?.isVerified ? "approved" : "pending"}`}>{profile?.isVerified ? "VERIFIED" : "PENDING"}</b></article><article><LockKeyhole /><div><h3>Protected account access</h3><p>Password, authentication and active account controls stay managed by the existing profile workflow.</p></div><Link to="/dashboard#profile">Account security <ArrowRight /></Link></article></div> : null}
          {tab === "api" ? <div className="seller-api-panel"><span><KeyRound /></span><div><small>API ACCESS</small><h3>Secure integration access</h3><p>API credentials are issued by marketplace administration. Keys are never displayed until access has been approved for this seller account.</p></div><b className="status-pill pending">ADMIN APPROVAL</b><Link to="/support">Request API access <ArrowRight /></Link></div> : null}
          {tab === "preferences" ? <div className="seller-preference-list"><article><div><Bell /><span><strong>Order notifications</strong><small>Receive updates when a buyer places or changes an order.</small></span></div><b>Enabled</b></article><article><div><MessageSquare /><span><strong>Buyer message alerts</strong><small>Keep new order conversations visible in Seller Center.</small></span></div><b>Enabled</b></article><article><div><Palette /><span><strong>Display preferences</strong><small>Responsive spacing and accessible contrast follow your device.</small></span></div><b>Automatic</b></article></div> : null}
          {tab === "support" ? <div className="seller-support-panel"><span><LifeBuoy /></span><div><small>SELLER SUPPORT</small><h3>Help when your business needs it</h3><p>Open a protected support ticket, review buyer-linked conversations, or visit the marketplace help center.</p><div><Link to="/support"><TicketCheck /> Create support ticket</Link><button onClick={() => selectTab("tickets")}><MessageSquare /> View seller tickets</button></div></div></div> : null}
        </section> : null}
      </section>

      <nav className="seller-mobile-bottom-nav"><button className={tab === "overview" ? "active" : ""} onClick={() => selectTab("overview")}><LayoutDashboard /><span>Home</span></button><button className={tab === "products" ? "active" : ""} onClick={() => selectTab("products")}><Boxes /><span>Products</span></button><button className="seller-mobile-fab" onClick={() => setOpen(true)} aria-label="Publish product"><PackagePlus /></button><button className={tab === "orders" ? "active" : ""} onClick={() => selectTab("orders")}><ShoppingBag /><span>Orders</span></button><button className={tab === "finance" ? "active" : ""} onClick={() => selectTab("finance")}><WalletCards /><span>Finance</span></button></nav>

      {deliveryOrder ? <div className="modal-backdrop seller-delivery-backdrop" role="dialog" aria-modal="true" aria-label="Delivered accounts"><section className="seller-delivery-modal"><header><div><small>DELIVERY DETAILS</small><h2>{deliveryOrder.productName}</h2><p>Order #{deliveryOrder.order.orderNumber} · {deliveryOrder.order.buyer.firstName} {deliveryOrder.order.buyer.lastName}</p></div><button type="button" onClick={() => setDeliveryOrder(null)} aria-label="Close"><X /></button></header><div className="seller-delivery-toolbar"><span><PackageCheck /> {deliveryOrder.inventoryItems?.length ?? 0} account{deliveryOrder.inventoryItems?.length === 1 ? "" : "s"} delivered</span><button type="button" onClick={() => void navigator.clipboard?.writeText((deliveryOrder.inventoryItems ?? []).map((row) => row.content).join("\n"))}><Copy /> Copy all</button></div><div className="seller-delivery-list">{deliveryOrder.inventoryItems?.map((row, index) => <article key={row.id}><b>{String(index + 1).padStart(2, "0")}</b><code>{row.content}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(row.content)} aria-label={`Copy delivered account ${index + 1}`}><Copy /></button></article>)}</div><footer><a href={apiDownloadUrl(`/api/commerce/order-items/${deliveryOrder.id}/delivery?format=txt`)}><FileText /> TXT file</a><a href={apiDownloadUrl(`/api/commerce/order-items/${deliveryOrder.id}/delivery?format=csv`)}><Download /> CSV file</a><a className="primary" href={apiDownloadUrl(`/api/commerce/order-items/${deliveryOrder.id}/delivery?format=zip`)}><Download /> Download ZIP</a></footer></section></div> : null}

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
