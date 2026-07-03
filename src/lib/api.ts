/**
 * API Service Layer
 * Communicates with the Express.js backend for all authentication and data operations.
 */

const API_BASE = 'http://localhost:3000/api';

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  termsAcceptedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

let accessToken: string | null = null;

/**
 * Set the access token for subsequent requests
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Make an authenticated API request
 */
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
    credentials: 'include', // Send cookies
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // If token expired, try to refresh
      if (response.status === 401 && data.code !== 'INVALID_CREDENTIALS') {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the original request
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

/**
 * Refresh the access token
 */
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

    // For file upload, use a special request function
    const url = `${API_BASE}/user/profile-picture`;
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Upload failed' };
      }
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
  getSellerApplications(status?: string) {
    const query = status ? `?status=${status}` : '';
    return request<{ applications: SellerApplication[] }>(`/admin/seller-applications${query}`);
  },

  reviewSellerApplication(id: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) {
    return request<{ message: string; application: SellerApplication }>(`/admin/seller-applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNote }),
    });
  },

  getNotifications() {
    return request<{ notifications: any[]; unreadCount: number }>('/admin/notifications');
  },

  markNotificationRead(id: string) {
    return request<{ message: string }>(`/admin/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  getUsers() {
    return request<{ users: User[] }>('/admin/users');
  },

  updateUser(id: string, data: { isBanned?: boolean; role?: string }) {
    return request<{ message: string; user: User }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};