import { formatDate, formatNpr } from "./format";
import type { TestSession } from "./types";

export interface Inventory {
  open: TestSession[];
  count: number;
  citySlugs: string[];
  cityNames: string[];
  providers: string[];
  providerLabels: string[];
  typeNames: string[];
  formats: string[];
  minFee: number | null;
  maxFee: number | null;
  next: TestSession | null;
  /** Latest data change among the sessions shown (ISO), or null. */
  updatedAt: string | null;
}

/** Facts about the sessions a page shows, computed from data so copy never over-promises. */
export function summarize(sessions: TestSession[]): Inventory {
  const open = sessions.filter((s) => s.is_bookable);
  const uniq = <T>(xs: T[]) => [...new Set(xs)];
  const fees = open.map((s) => s.fee_npr);
  const updated = sessions.map((s) => s.updated_at).filter(Boolean);
  return {
    open,
    count: open.length,
    citySlugs: uniq(open.map((s) => s.city.slug)),
    cityNames: uniq(open.map((s) => s.city.name)),
    providers: uniq(open.map((s) => s.provider)),
    providerLabels: uniq(open.map((s) => s.provider_label)),
    typeNames: uniq(open.map((s) => s.test_type.name)),
    formats: uniq(open.map((s) => s.format_label)),
    minFee: fees.length ? Math.min(...fees) : null,
    maxFee: fees.length ? Math.max(...fees) : null,
    next: open[0] ?? null,
    updatedAt: updated.length ? updated.reduce((a, b) => (a > b ? a : b)) : null,
  };
}

export function feeRange(inv: Pick<Inventory, "minFee" | "maxFee">): string | null {
  if (inv.minFee === null || inv.maxFee === null) return null;
  return inv.minFee === inv.maxFee
    ? formatNpr(inv.minFee)
    : `${formatNpr(inv.minFee)} to ${formatNpr(inv.maxFee)}`;
}

/** Trim to a meta description: at most 155 characters, cut at a word boundary. */
export function clampDescription(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function nextDateLabel(inv: Inventory): string | null {
  return inv.next ? formatDate(inv.next.date) : null;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** "Updated" date shown on pages: the latest data change, as a plain date. */
export function updatedLabel(iso: string | null): string | null {
  return iso ? formatDate(iso.slice(0, 10)) : null;
}
