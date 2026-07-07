export type Role = "CUSTOMER" | "SELLER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const STAFF_ROLES: Role[] = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

export function homePathForRole(role: Role) {
  return STAFF_ROLES.includes(role) ? "/admin" : "/dashboard";
}

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  city?: string | null;
  profileImageUrl?: string | null;
  role: Role;
  isSuspended: boolean;
  emailVerified: boolean;
  createdAt: string;
};

export type SellerApplication = {
  id: string;
  userId: string;
  userName: string;
  fullLegalName: string;
  phoneNumber: string;
  email: string;
  country: string;
  stateProvince: string;
  city: string;
  fullAddress: string;
  postalCode: string;
  storeName: string;
  storeDescription: string;
  productCategories: string[];
  termsAccepted: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "email" | "username" | "role">;
};

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

const configuredApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const useRemoteApi = (import.meta.env.VITE_USE_REMOTE_API as string | undefined)?.trim() === "true";
const API_BASE_URL = (useRemoteApi ? configuredApiUrl || "" : "").replace(/\/+$/, "");

let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new ApiError(
      import.meta.env.DEV
        ? "Cannot reach the local authentication service. Start the API server with npm run dev:api and keep the Vite proxy on /api."
        : "Cannot reach the authentication service. Check that the Vercel /api rewrite points to the Railway API, then redeploy both services.",
      0,
      "NETWORK_ERROR",
      error
    );
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(
      import.meta.env.DEV
        ? "The local authentication API is not responding with JSON. Make sure npm run dev:api is running on port 4000."
        : "The authentication API is not configured for this deployment. Check the Vercel /api rewrite and Railway public URL, then redeploy.",
      response.status,
      "API_MISCONFIGURED"
    );
  }
}

export async function getCsrfToken() {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await request(`${API_BASE_URL}/api/csrf`, {
    credentials: "include"
  });

  const data = await readJson(response) as { csrfToken?: string } | undefined;
  if (!response.ok || !data?.csrfToken) {
    throw new ApiError(
      "Could not initialize secure request token.",
      response.status,
      "CSRF_INITIALIZATION_FAILED"
    );
  }

  csrfToken = data.csrfToken;

  return csrfToken;
}

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !(value instanceof FormData);
}

async function refreshSession() {
  const data = await apiRequest<{ user: User; csrfToken: string }>(
    "/api/auth/refresh",
    { method: "POST" },
    false
  );
  csrfToken = data.csrfToken;

  return data.user;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
  retryOnUnauthorized = true
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  let body = options.body ?? null;

  if (isUnsafeMethod(method)) {
    headers.set("x-csrf-token", await getCsrfToken());
  }

  if (isPlainObject(body)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await request(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    body: body as BodyInit | null,
    credentials: "include"
  });

  if (response.status === 401 && retryOnUnauthorized && path !== "/api/auth/refresh") {
    await refreshSession();
    return apiRequest<T>(path, options, false);
  }

  const data = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? `Request failed (${response.status}).`,
      response.status,
      data?.code,
      data?.details
    );
  }

  if (data?.csrfToken) {
    csrfToken = data.csrfToken;
  }

  return data as T;
}

export function resetCsrfToken() {
  csrfToken = null;
}
