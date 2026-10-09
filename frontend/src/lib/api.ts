/** Browser-side API client. Calls go to /api/... on our own origin (proxied to Django). */
import type { Booking, City, Inquiry, Page, SiteInfo, TestSession, TestType, User } from "./types";

export class ApiError extends Error {
  status: number;
  /** Field errors from the API, keyed by field name. "detail" and "non_field_errors" are general errors. */
  fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrf(): Promise<string> {
  const existing = readCookie("csrftoken");
  if (existing) return existing;
  const res = await fetch("/api/v1/csrf/", { credentials: "same-origin" });
  const data = (await res.json()) as { csrfToken: string };
  return readCookie("csrftoken") ?? data.csrfToken;
}

function normaliseErrors(body: unknown, status: number): ApiError {
  const fallback =
    status === 429
      ? "Too many attempts. Please wait a few minutes and try again."
      : status >= 500
        ? "Something went wrong on our side. Please try again in a moment."
        : "Something went wrong. Please check your details and try again.";
  if (!body || typeof body !== "object") return new ApiError(status, fallback);
  const fields: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (Array.isArray(value)) fields[key] = value.map(String);
    else if (typeof value === "string") fields[key] = [value];
  }
  const general = fields.detail?.[0] ?? fields.non_field_errors?.[0];
  const first = Object.values(fields)[0]?.[0];
  return new ApiError(status, general ?? first ?? fallback, fields);
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") {
    // For FormData the browser sets the multipart boundary itself.
    if (!options.form) headers["Content-Type"] = "application/json";
    headers["X-CSRFToken"] = await ensureCsrf();
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: options.signal,
    });
  } catch {
    throw new ApiError(
      0,
      "We could not reach the server. Check your internet connection and try again.",
    );
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw normaliseErrors(body, res.status);
  return body as T;
}

export const authApi = {
  me: async (): Promise<User | null> => {
    const res = await api<User | { authenticated: false }>("/auth/me/");
    return "id" in res ? res : null;
  },
  login: (email: string, password: string) =>
    api<User>("/auth/login/", { method: "POST", body: { email, password } }),
  register: (body: { email: string; password: string; full_name: string; phone: string }) =>
    api<User>("/auth/register/", { method: "POST", body }),
  logout: () => api<void>("/auth/logout/", { method: "POST" }),
  updateMe: (body: Partial<Pick<User, "full_name" | "phone" | "date_of_birth">>) =>
    api<User>("/auth/me/", { method: "PATCH", body }),
  verifyEmail: (token: string) =>
    api<{ detail: string }>("/auth/verify-email/", { method: "POST", body: { token } }),
  resendVerification: () =>
    api<{ detail: string }>("/auth/resend-verification/", { method: "POST" }),
  requestReset: (email: string) =>
    api<{ detail: string }>("/auth/password-reset/", { method: "POST", body: { email } }),
  confirmReset: (body: { uid: string; token: string; password: string }) =>
    api<{ detail: string }>("/auth/password-reset/confirm/", { method: "POST", body }),
};

export const bookingApi = {
  session: (id: number | string) => api<TestSession>(`/sessions/${id}/`),
  create: (form: FormData) => api<Booking>("/bookings/", { method: "POST", form }),
  mine: () => api<Booking[]>("/bookings/"),
  get: (id: number | string) => api<Booking>(`/bookings/${id}/`),
  cancel: (id: number) => api<Booking>(`/bookings/${id}/cancel/`, { method: "POST" }),
  resend: (id: number) => api<Booking>(`/bookings/${id}/whatsapp/`, { method: "POST" }),
};

export interface InquiryInput {
  name: string;
  phone: string;
  email?: string;
  preferred_city?: string | null;
  test_type?: string | null;
  format?: string;
  preferred_month?: string;
  message?: string;
}

export const inquiryApi = {
  create: (body: InquiryInput) => api<Inquiry>("/inquiries/", { method: "POST", body }),
  mine: () => api<Inquiry[]>("/inquiries/mine/"),
};

export const catalogApi = {
  cities: () => api<City[]>("/cities/"),
  testTypes: () => api<TestType[]>("/test-types/"),
  regions: () => api<{ provinces: Record<string, string[]> }>("/regions/"),
  site: () => api<SiteInfo>("/site/"),
  content: () => api<{ key: string; title: string; body: string }[]>("/content/"),
  sessions: (params: Record<string, string | undefined>, signal?: AbortSignal) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    return api<Page<TestSession>>(`/sessions/?${sp.toString()}`, { signal });
  },
};
