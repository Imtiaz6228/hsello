/**
 * API Service Layer
 * Communicates with the Express.js backend for all authentication and data operations.
 */

// Auto-detect API base: uses same origin in production, localhost:3000 in dev
const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // In production, use same origin (assumes API is served from same domain or proxied)
    return '/api';
  }
  return 'http://localhost:3000/api';
})();

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  issues?: Array<{ field: string; message: string }>;
}

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  city: string | null;
  profileImageUrl: string | null;
  role: string;
  emailVerifiedAt: string | null;
  isBanned: boolean;
  isSuspended?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface SellerApplication {
  id: string;
  userId: string;
  userName: string;
  fullLegalName: string;
  storeName: string;
  phone: string;
  email: string;
  country: string;
  stateProvince: string;
  city: string;
  fullAddress: string;
  postalCode: string;
  storeDescription: string;
  productCategories: string;
  businessDocument?: string;
  identityDocument?: string;
  taxInfo?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  termsAcceptedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

interface Store {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: string;
  totalRevenue: number;
  totalOrders: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  _count?: { products: number };
}

interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  title: string;
  titleRu?: string;
  titleZh?: string;
  description: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  tags: string;
  warrantyDays: number;
  stockQuantity: number;
  soldCount: number;
  moderationNote?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
  store?: { id: string; storeName: string };
  category?: { id: string; name: string };
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  platformFee: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentTxId?: string;
  shippingAddress?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  items?: OrderItem[];
  invoice?: Invoice;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  pdfUrl?: string;
}

interface Category {
  id: string;
  name: string;
  nameRu: string;
  nameZh: string;
  slug: string;
  icon: string;
  imageUrl?: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  parent?: { id: string; name: string };
  _count?: { products: number; children: number };
}

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountPercent: number;
  discountFixed: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  comment?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  product?: Product;
}

interface SupportTicket {
  id: string;
  userId?: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  assignee?: User;
  messages?: TicketMessage[];
  _count?: { messages: number };
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  message: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalVendors: number;
  totalAdmins: number;
  totalModerators: number;
  bannedUsers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingSellerApplications: number;
  pendingProducts: number;
  totalProducts: number;
  totalCategories: number;
  totalCoupons: number;
  totalReviews: number;
  todayOrders: number;
  monthOrders: number;
}

interface AuditLog {
  id: string;
  userId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && data.code !== 'INVALID_CREDENTIALS') {
        const refreshed = await refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${accessToken}`;
          const retryResponse = await fetch(url, { ...config, headers });
          const retryData = await retryResponse.json();
          if (retryResponse.ok) {
            return { data: retryData };
          }
          return { error: retryData.error || 'Request failed', code: retryData.code, issues: retryData.issues };
        }
      }
      return { error: data.error || 'Request failed', code: data.code, issues: data.issues };
    }

    return { data };
  } catch (err) {
    return { error: 'Network error. Please check your connection and try again.', code: 'NETWORK_ERROR' };
  }
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      accessToken = null;
      return false;
    }

    const data = await response.json();
    if (data.accessToken) {
      accessToken = data.accessToken;
      return true;
    }
    return false;
  } catch {
    accessToken = null;
    return false;
  }
}

// ─── Auth API ─────────────────────────────────────────────

export interface RegisterData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  country: string;
  city?: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export const authApi = {
  register(data: RegisterData) {
    return request<{ message: string; user: User; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login(data: LoginData) {
    return request<{ message: string; user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  logout() {
    return request<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  getMe() {
    return request<{ user: User }>('/auth/me');
  },

  verifyEmail(token: string) {
    return request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  resendVerification() {
    return request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
    });
  },

  forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(data: ResetPasswordData) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ─── User API ─────────────────────────────────────────────

export const userApi = {
  getProfile() {
    return request<{ user: User }>('/user/profile');
  },

  updateProfile(data: Partial<User>) {
    return request<{ message: string; user: User }>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const url = `${API_BASE}/user/profile-picture`;
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return fetch(url, { method: 'POST', headers, credentials: 'include', body: formData })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) return { error: data.error || 'Upload failed' };
        return { data };
      });
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getDashboard() {
    return request<{ user: User; sellerApplication: SellerApplication | null }>('/user/dashboard');
  },
};

// ─── Seller API ───────────────────────────────────────────

export interface SellerApplicationData {
  fullLegalName: string;
  storeName: string;
  phone: string;
  email: string;
  country: string;
  stateProvince: string;
  city: string;
  fullAddress: string;
  postalCode: string;
  storeDescription: string;
  productCategories: string;
  termsAccepted: boolean;
}

export const sellerApi = {
  apply(data: SellerApplicationData) {
    return request<{ message: string; application: SellerApplication }>('/seller/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getApplication() {
    return request<{ application: SellerApplication }>('/seller/application');
  },
  getDashboard() {
    return request<{ user: User; application: SellerApplication | null }>('/seller/dashboard');
  },
};

// ─── Admin API ────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  getDashboard() {
    return request<{
      stats: DashboardStats;
      recentOrders: Order[];
      recentUsers: User[];
      ordersByStatus: { status: string; count: number }[];
      monthlyRevenueData: { month: string; year: number; revenue: number }[];
    }>('/admin/dashboard');
  },

  // Users
  getUsers(params?: { search?: string; role?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ users: User[]; total: number; page: number; totalPages: number }>(`/admin/users${qs ? '?' + qs : ''}`);
  },

  getUser(id: string) {
    return request<{ user: User & { sellerApplication?: SellerApplication; store?: Store; _count?: { orders: number; reviews: number } } }>(`/admin/users/${id}`);
  },

  updateUser(id: string, data: { role?: string; isBanned?: boolean; isSuspended?: boolean; suspensionReason?: string; firstName?: string; lastName?: string; phone?: string }) {
    return request<{ message: string; user: User }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  resetUserPassword(id: string, newPassword: string) {
    return request<{ message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  // Seller Applications
  getSellerApplications(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ applications: (SellerApplication & { user: User })[]; total: number; page: number; totalPages: number }>(`/admin/seller-applications${qs ? '?' + qs : ''}`);
  },

  getSellerApplication(id: string) {
    return request<{ application: SellerApplication & { user: User } }>(`/admin/seller-applications/${id}`);
  },

  reviewSellerApplication(id: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) {
    return request<{ message: string; application: SellerApplication }>(`/admin/seller-applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNote }),
    });
  },

  // Stores
  getStores(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return request<{ stores: (Store & { user: User; _count: { products: number } })[] }>(`/admin/stores${qs}`);
  },

  updateStore(id: string, data: { status?: string; storeName?: string; description?: string }) {
    return request<{ message: string; store: Store }>(`/admin/stores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Products
  getProducts(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ products: Product[]; total: number; page: number; totalPages: number }>(`/admin/products${qs ? '?' + qs : ''}`);
  },

  getProduct(id: string) {
    return request<{ product: Product & { reviews: Review[] } }>(`/admin/products/${id}`);
  },

  updateProduct(id: string, data: { status?: string; isActive?: boolean; isFeatured?: boolean; moderationNote?: string; title?: string; price?: number }) {
    return request<{ message: string; product: Product }>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteProduct(id: string) {
    return request<{ message: string }>(`/admin/products/${id}`, { method: 'DELETE' });
  },

  // Orders
  getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ orders: Order[]; total: number; page: number; totalPages: number }>(`/admin/orders${qs ? '?' + qs : ''}`);
  },

  getOrder(id: string) {
    return request<{ order: Order }>(`/admin/orders/${id}`);
  },

  updateOrder(id: string, data: { status?: string; trackingNumber?: string; notes?: string }) {
    return request<{ message: string; order: Order }>(`/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Categories
  getCategories() {
    return request<{ categories: Category[] }>('/admin/categories');
  },

  createCategory(data: { name: string; nameRu?: string; nameZh?: string; slug: string; icon?: string; description?: string; parentId?: string; sortOrder?: number }) {
    return request<{ message: string; category: Category }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCategory(id: string, data: Partial<Category>) {
    return request<{ message: string; category: Category }>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteCategory(id: string) {
    return request<{ message: string }>(`/admin/categories/${id}`, { method: 'DELETE' });
  },

  // Reviews
  getReviews(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return request<{ reviews: (Review & { user: User; product: Product })[] }>(`/admin/reviews${qs}`);
  },

  updateReview(id: string, status: string) {
    return request<{ message: string; review: Review }>(`/admin/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Coupons
  getCoupons() {
    return request<{ coupons: Coupon[] }>('/admin/coupons');
  },

  createCoupon(data: { code: string; description?: string; discountPercent?: number; discountFixed?: number; minOrderAmount?: number; maxUses?: number; expiresAt?: string }) {
    return request<{ message: string; coupon: Coupon }>('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCoupon(id: string, data: { isActive?: boolean; description?: string; discountPercent?: number; discountFixed?: number; maxUses?: number }) {
    return request<{ message: string; coupon: Coupon }>(`/admin/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteCoupon(id: string) {
    return request<{ message: string }>(`/admin/coupons/${id}`, { method: 'DELETE' });
  },

  // Tickets
  getTickets(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return request<{ tickets: SupportTicket[] }>(`/admin/tickets${qs}`);
  },

  getTicket(id: string) {
    return request<{ ticket: SupportTicket & { messages: TicketMessage[] } }>(`/admin/tickets/${id}`);
  },

  updateTicket(id: string, data: { status?: string; priority?: string; assignedTo?: string }) {
    return request<{ message: string; ticket: SupportTicket }>(`/admin/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  replyTicket(id: string, message: string) {
    return request<{ message: string; ticketMessage: TicketMessage }>(`/admin/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // Withdrawals
  getWithdrawals(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return request<{ withdrawals: Withdrawal[] }>(`/admin/withdrawals${qs}`);
  },

  updateWithdrawal(id: string, data: { status: string; details?: string }) {
    return request<{ message: string; withdrawal: Withdrawal }>(`/admin/withdrawals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Settings
  getSettings() {
    return request<{ settings: Record<string, string> }>('/admin/settings');
  },

  updateSettings(settings: Record<string, string>) {
    return request<{ message: string }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Notifications
  getNotifications() {
    return request<{ notifications: any[]; unreadCount: number }>('/admin/notifications');
  },

  markNotificationRead(id: string) {
    return request<{ message: string }>(`/admin/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllNotificationsRead() {
    return request<{ message: string }>('/admin/notifications/read-all', { method: 'PATCH' });
  },

  // Audit Logs
  getAuditLogs(page = 1, limit = 50) {
    return request<{ logs: AuditLog[]; total: number; page: number; totalPages: number }>(`/admin/audit-logs?page=${page}&limit=${limit}`);
  },
};

// ─── Order API (public) ───────────────────────────────────

export const orderApi = {
  createOrder(data: { items: Array<{ productId: string; quantity: number }>; paymentMethod?: string }) {
    return request<{ message: string; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getOrders() {
    return request<{ orders: Order[] }>('/orders');
  },

  getOrder(id: string) {
    return request<{ order: Order }>(`/orders/${id}`);
  },
};

// ─── Public API (no auth required) ───────────────────────

export const publicApi = {
  getCategories() {
    return request<{ categories: Category[] }>('/categories');
  },

  getProducts(params?: { categoryId?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<{ products: Product[] }>(`/products${qs ? '?' + qs : ''}`);
  },

  getProduct(id: string) {
    return request<{ product: Product }>(`/products/${id}`);
  },
};
