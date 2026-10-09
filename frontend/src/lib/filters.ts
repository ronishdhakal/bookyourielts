import type { SessionFilters } from "./types";

const KEYS = [
  "city",
  "provider",
  "category",
  "test_type",
  "test_format",
  "month",
  "hide_closed",
  "page",
] as const;

/** Pick only known filter params from a Next searchParams object. */
export function cleanFilters(raw: Record<string, string | string[] | undefined>): SessionFilters {
  const out: SessionFilters = {};
  for (const k of KEYS) {
    const v = raw[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s && s.length < 40) out[k] = s;
  }
  return out;
}
