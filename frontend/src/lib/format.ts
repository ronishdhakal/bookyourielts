import type { SeatStatus, TestFormat } from "./types";

/** API dates are plain YYYY-MM-DD in Nepal time. Format them as UTC midnight so they never shift. */
function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(toDate(iso));
}

export const formatDay = (iso: string) =>
  formatDate(iso, { weekday: "short", year: undefined, month: "short" });
export const formatLong = (iso: string) => formatDate(iso, { weekday: "long", month: "long" });

export const formatNpr = (n: number) => `NPR ${new Intl.NumberFormat("en-IN").format(n)}`;

export const SLOT_TIMES: Record<string, string> = {
  morning: "9:00 am – 12:00 pm",
  afternoon: "1:00 pm – 4:00 pm",
};

export const FORMAT_LABELS: Record<TestFormat, string> = {
  computer: "Computer-delivered",
  computer_wop: "Computer-delivered with Writing on Paper",
};

export const FORMAT_SHORT: Record<TestFormat, string> = {
  computer: "On computer",
  computer_wop: "Computer + paper Writing",
};

export const STATUS_COPY: Record<SeatStatus, { label: string; glyph: string }> = {
  available: { label: "Available", glyph: "●" },
  few_left: { label: "Few seats left", glyph: "▲" },
  full: { label: "Full", glyph: "■" },
  closed: { label: "Registration closed", glyph: "–" },
};

export function monthOptions(count = 8): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    out.push({
      value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
      }).format(d),
    });
  }
  return out;
}

export function monthLabel(value: string): string {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** "5 minutes ago", "2 days ago", or a plain date once it is older than a week. */
export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso.slice(0, 10));
}
