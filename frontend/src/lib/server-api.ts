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

async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
      next: { revalidate },
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

export const fetchSessions = (filters: SessionFilters = {}, revalidate = 30) =>
  get<Page<TestSession>>(`/sessions/${qs({ ...filters })}`, revalidate);
export const fetchCities = () => get<City[]>("/cities/", 120);
export const fetchTestTypes = () => get<TestType[]>("/test-types/", 600);
export const fetchSite = () => get<SiteInfo>("/site/", 120);
export const fetchFaqs = async (page?: string) =>
  (await get<Faq[]>(`/faqs/${qs({ page })}`, 300)) ?? [];
export const fetchContent = async () => (await get<ContentBlock[]>("/content/", 300)) ?? [];

export const fetchSession = (id: string) =>
  get<TestSession>(`/sessions/${encodeURIComponent(id)}/`, 15);
