"use client";

import { useEffect, useState } from "react";
import type { BookingStatus, InquiryStatus } from "@/lib/types";

export function PageTitle({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-bold md:text-3xl">{title}</h1>
        {lede && <p className="text-muted mt-1 max-w-2xl">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

const BOOKING: Record<BookingStatus, { label: string; cls: string }> = {
  initiated: {
    label: "Awaiting confirmation",
    cls: "bg-marigold/25 text-[#6b4a00] ring-marigold/60",
  },
  confirmed: { label: "Confirmed", cls: "bg-ok/10 text-ok ring-ok/30" },
  cancelled: { label: "Cancelled", cls: "bg-mist text-muted ring-mist" },
};
const INQUIRY: Record<InquiryStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-crimson/10 text-crimson ring-crimson/30" },
  contacted: { label: "Contacted", cls: "bg-marigold/25 text-[#6b4a00] ring-marigold/60" },
  closed: { label: "Closed", cls: "bg-ok/10 text-ok ring-ok/30" },
};

export function Pill({ kind, status }: { kind: "booking" | "inquiry"; status: string }) {
  const map = kind === "booking" ? BOOKING : INQUIRY;
  const ui = (map as Record<string, { label: string; cls: string }>)[status] ?? {
    label: status,
    cls: "bg-mist",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${ui.cls}`}
    >
      {ui.label}
    </span>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="border-mist flex gap-1 overflow-x-auto border-b"
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors ${
            value === it.value
              ? "border-crimson text-ink"
              : "text-muted hover:text-ink border-transparent"
          }`}
        >
          {it.label}
          {it.count !== undefined && it.count > 0 && (
            <span className="bg-ink/10 ml-2 rounded-full px-1.5 py-0.5 font-mono text-xs">
              {it.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Search box that waits for a short pause in typing before reporting the value. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => local !== value && onChange(local), 350);
    return () => clearTimeout(t);
  }, [local, value, onChange]);
  return (
    <div className="min-w-56 flex-1">
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <input
        id="search"
        type="search"
        className="field-input !min-h-11"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}

export function Pager({
  page,
  count,
  size,
  onPage,
}: {
  page: number;
  count: number;
  size: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-[0.9375rem]">
      <span className="text-muted">
        Page {page} of {pages} · {count} total
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </span>
    </nav>
  );
}

export function EmptyRow({ title, text }: { title: string; text?: string }) {
  return (
    <div className="border-mist rounded-lg border-2 border-dashed px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {text && <p className="text-muted mt-1">{text}</p>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="border-crimson text-crimson rounded-lg border-2 px-4 py-3 font-medium"
    >
      {message}{" "}
      {onRetry && (
        <button type="button" className="underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-light h-14 rounded-md" />
      ))}
    </div>
  );
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
