import type { SessionFilters, TestSession } from "./types";

/** Test-type landing pages: one path per type, all server-rendered with a live table. */
export interface TypePage {
  path: string;
  /** Short label used in links, breadcrumbs and titles. */
  label: string;
  /** Plain-English sentence on what the test is for (from the site's own descriptions). */
  purpose: string;
  /** Session filters that select this type from the API. */
  filters: SessionFilters;
  /** Extra client-side narrowing, for types the API cannot filter on directly. */
  match?: (s: TestSession) => boolean;
}

export const TYPE_PAGES: TypePage[] = [
  {
    path: "/ielts-academic-test-dates-nepal",
    label: "IELTS Academic",
    purpose: "University study and professional registration.",
    filters: { test_type: "academic" },
  },
  {
    path: "/ielts-general-training-test-dates-nepal",
    label: "IELTS General Training",
    purpose: "Work experience, training and migration.",
    filters: { test_type: "general-training" },
  },
  {
    path: "/ielts-ukvi-nepal",
    label: "IELTS UKVI",
    purpose: "UK visa and immigration applications (UKVI Academic and UKVI General Training).",
    filters: { category: "ukvi" },
    match: (s) => s.test_type.code !== "life-skills",
  },
  {
    path: "/ielts-life-skills-nepal",
    label: "IELTS Life Skills",
    purpose: "Speaking and Listening only, for some UK visa routes (levels A1, A2 and B1).",
    filters: { test_type: "life-skills" },
  },
];

export function getTypePage(path: string): TypePage {
  const t = TYPE_PAGES.find((x) => x.path === path);
  if (!t) throw new Error(`Unknown type page ${path}`);
  return t;
}

export const typePageFor = (code: string): TypePage | undefined =>
  TYPE_PAGES.find(
    (t) =>
      t.filters.test_type === code || (t.filters.category === "ukvi" && code.startsWith("ukvi-")),
  );

/** Provider landing pages under /ielts-test-dates/. Only shown when the provider has open dates. */
export const PROVIDER_PAGES = [
  { slug: "british-council", code: "british_council", label: "British Council" },
  { slug: "idp", code: "idp", label: "IDP" },
] as const;

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "2026-10" → "october-2026" */
export function monthSlug(value: string): string {
  const [y, m] = value.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]}-${y}`;
}

/** "october-2026" → "2026-10", or null when the slug is not a month. */
export function parseMonthSlug(slug: string): string | null {
  const m = /^([a-z]+)-(\d{4})$/.exec(slug);
  if (!m) return null;
  const idx = MONTHS.indexOf(m[1] ?? "");
  return idx < 0 ? null : `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
}

/** Months (YYYY-MM, ascending) that have at least one session. */
export function monthsWithSessions(sessions: TestSession[]): string[] {
  return [...new Set(sessions.map((s) => s.date.slice(0, 7)))].sort();
}
