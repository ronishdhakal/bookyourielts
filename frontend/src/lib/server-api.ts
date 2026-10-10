import "server-only";
import type {
  City,
  ContentBlock,
  Faq,
  Page,
  SessionFilters,
  SiteInfo,
  TestSession,
  TestType,
} from "./types";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

/** Revalidation windows (seconds). The Django side also calls /revalidate when data changes. */
export const CATALOG_TAG = "catalog";
const SESSIONS_TTL = 600;

async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
      next: { revalidate, tags: [CATALOG_TAG] },
      // Internal call over plain HTTP: tell Django the original request was HTTPS so it does not redirect.
      headers: { "X-Forwarded-Proto": "https" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const fetchSessions = (filters: SessionFilters = {}, revalidate = SESSIONS_TTL) =>
  get<Page<TestSession>>(`/sessions/${qs({ ...filters })}`, revalidate);
/** Every open date (up to 100), used for summaries, month links and sitemap. */
export const fetchOpenSessions = () =>
  fetchSessions({ hide_closed: "true", page_size: "100" }, SESSIONS_TTL);
export const fetchCities = () => get<City[]>("/cities/", SESSIONS_TTL);
export const fetchTestTypes = () => get<TestType[]>("/test-types/", 600);
export const fetchSite = () => get<SiteInfo>("/site/", 300);
export const fetchFaqs = async (page?: string) =>
  (await get<Faq[]>(`/faqs/${qs({ page })}`, 300)) ?? [];
export const fetchContent = async () => (await get<ContentBlock[]>("/content/", 300)) ?? [];

export const fetchSession = (id: string) =>
  get<TestSession>(`/sessions/${encodeURIComponent(id)}/`, 15);
