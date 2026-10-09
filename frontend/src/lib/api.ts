/** Browser-side API client. Calls go to /api/... on our own origin (proxied to Django). */
import type {
  Booking,
  BookingStatus,
  City,
  DateAlert,
  Inquiry,
  InquiryStatus,
  Page,
  PortalNotification,
  SavedCandidate,
  SiteInfo,
  StaffBooking,
  StaffInquiry,
  StaffMeta,
  StaffSession,
  StaffSettings,
  Stats,
  TestSession,
  TestType,
  User,
} from "./types";

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
  updateMe: (
    body: Partial<Pick<User, "full_name" | "phone" | "date_of_birth" | "email_notifications">>,
  ) => api<User>("/auth/me/", { method: "PATCH", body }),
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
  changeDate: (id: number, session: number) =>
    api<Booking>(`/bookings/${id}/change-date/`, { method: "POST", body: { session } }),
  documents: (id: number, form: FormData) =>
    api<Booking>(`/bookings/${id}/documents/`, { method: "POST", form }),
  requestChange: (id: number, message: string) =>
    api<Booking>(`/bookings/${id}/change-request/`, { method: "POST", body: { message } }),
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

function query(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

type Params = Record<string, string | number | undefined>;

export const manageApi = {
  stats: () => api<Stats>("/manage/stats/"),
  meta: () => api<StaffMeta>("/manage/meta/"),
  bookings: (p: Params, signal?: AbortSignal) =>
    api<Page<StaffBooking>>(`/manage/bookings/${query(p)}`, { signal }),
  booking: (id: number | string) => api<StaffBooking>(`/manage/bookings/${id}/`),
  updateBooking: (
    id: number,
    body: {
      status?: BookingStatus;
      admin_notes?: string;
      resolve_change?: boolean;
      assigned_slot?: "" | "morning" | "afternoon";
      assigned_venue?: string;
    },
  ) => api<StaffBooking>(`/manage/bookings/${id}/`, { method: "PATCH", body }),
  inquiries: (p: Params, signal?: AbortSignal) =>
    api<Page<StaffInquiry>>(`/manage/inquiries/${query(p)}`, { signal }),
  updateInquiry: (id: number, body: { status?: InquiryStatus; admin_notes?: string }) =>
    api<StaffInquiry>(`/manage/inquiries/${id}/`, { method: "PATCH", body }),
  sessions: (p: Params, signal?: AbortSignal) =>
    api<Page<StaffSession>>(`/manage/sessions/${query(p)}`, { signal }),
  session: (id: number | string) => api<StaffSession>(`/manage/sessions/${id}/`),
  createSession: (body: Partial<StaffSession>) =>
    api<StaffSession>("/manage/sessions/", { method: "POST", body }),
  updateSession: (id: number, body: Partial<StaffSession>) =>
    api<StaffSession>(`/manage/sessions/${id}/`, { method: "PATCH", body }),
  deleteSession: (id: number) => api<void>(`/manage/sessions/${id}/`, { method: "DELETE" }),
  bulkSessions: (ids: number[], action: "delete" | "hide" | "show") =>
    api<{ deleted?: number; skipped?: number; updated?: number }>("/manage/sessions/bulk/", {
      method: "POST",
      body: { ids, action },
    }),
  messageBooking: (id: number, message: string) =>
    api<StaffBooking>(`/manage/bookings/${id}/message/`, { method: "POST", body: { message } }),
  bulkCreateSessions: (body: Record<string, unknown>) =>
    api<{ created: number; skipped: string[]; dates: string[] }>("/manage/sessions/bulk-create/", {
      method: "POST",
      body,
    }),
  bulkBookings: (ids: number[]) =>
    api<{ deleted: number }>("/manage/bookings/bulk/", {
      method: "POST",
      body: { ids, action: "delete" },
    }),
  bulkInquiries: (ids: number[]) =>
    api<{ deleted: number }>("/manage/inquiries/bulk/", {
      method: "POST",
      body: { ids, action: "delete" },
    }),
  settings: () => api<StaffSettings>("/manage/settings/"),
  updateSettings: (body: Partial<StaffSettings>) =>
    api<StaffSettings>("/manage/settings/", { method: "PATCH", body }),
};

export const candidateApi = {
  list: () => api<SavedCandidate[]>("/candidates/"),
  create: (form: FormData) => api<SavedCandidate>("/candidates/", { method: "POST", form }),
  update: (id: number, form: FormData) =>
    api<SavedCandidate>(`/candidates/${id}/`, { method: "PATCH", form }),
  remove: (id: number) => api<void>(`/candidates/${id}/`, { method: "DELETE" }),
};

export interface AlertInput {
  provider?: string;
  category?: string;
  test_type?: string | null;
  test_format?: string;
  city?: string | null;
  month?: string;
}

export const alertApi = {
  list: () => api<DateAlert[]>("/alerts/"),
  create: (body: AlertInput) => api<DateAlert>("/alerts/", { method: "POST", body }),
  update: (id: number, body: { is_active: boolean }) =>
    api<DateAlert>(`/alerts/${id}/`, { method: "PATCH", body }),
  remove: (id: number) => api<void>(`/alerts/${id}/`, { method: "DELETE" }),
  seen: (id: number) => api<DateAlert>(`/alerts/${id}/seen/`, { method: "POST" }),
};

export const notificationApi = {
  list: () => api<{ unread: number; results: PortalNotification[] }>("/notifications/"),
  markRead: (what: { ids: number[] } | { all: true }) =>
    api<{ unread: number }>("/notifications/read/", { method: "POST", body: what }),
};
