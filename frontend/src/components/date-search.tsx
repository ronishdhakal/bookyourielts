"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { monthOptions } from "@/lib/format";
import type { City, SessionFilters, TestType } from "@/lib/types";

const FORMATS = [
  { value: "computer", label: "Computer-delivered" },
  { value: "computer_wop", label: "Computer with Writing on Paper" },
];

type Mode = "submit" | "live";

/**
 * Search dates by preference: provider, exam category, test type, format, city and month.
 * "submit" mode (home page) sends the student to the schedule; "live" mode (schedule page) refines in place.
 */
export function DateSearch({
  cities,
  types,
  basePath = "/ielts-test-dates",
  current = {},
  mode = "submit",
  lockCity = false,
}: {
  cities: City[];
  types: TestType[];
  basePath?: string;
  current?: SessionFilters;
  mode?: Mode;
  /** On a city page the city comes from the URL. */
  lockCity?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<SessionFilters>(current);
  const months = monthOptions(8);
  const f = mode === "live" ? current : draft;
  const typeOptions = f.category
    ? types.filter((t) => t.is_ukvi === (f.category === "ukvi"))
    : types;
  const [open, setOpen] = useState(false);

  function push(next: SessionFilters) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (k === "page" || !v || (lockCity && k === "city")) continue;
      sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  }

  function set(patch: SessionFilters) {
    const next = { ...f, ...patch };
    // A type that no longer fits the chosen category is dropped.
    if (patch.category !== undefined && next.test_type) {
      const t = types.find((x) => x.code === next.test_type);
      if (t && next.category && t.is_ukvi !== (next.category === "ukvi")) next.test_type = "";
    }
    if (mode === "live") push(next);
    else setDraft(next);
  }

  const active = [
    f.provider,
    !lockCity && f.city,
    f.category,
    f.test_type,
    f.test_format,
    f.month,
    f.hide_closed,
  ].filter(Boolean).length;
  const field = (
    id: string,
    label: string,
    key: keyof SessionFilters,
    any: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="min-w-0">
      <label htmlFor={`ds-${id}`} className="field-label">
        {label}
      </label>
      <select
        id={`ds-${id}`}
        name={key}
        className="field-input"
        value={f[key] ?? ""}
        onChange={(e) => set({ [key]: e.target.value })}
      >
        <option value="">{any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {field("provider", "Exam provider", "provider", "Any provider", [
        { value: "british_council", label: "British Council IELTS" },
        { value: "idp", label: "IDP IELTS" },
      ])}
      {field("category", "IELTS exam", "category", "Regular and UKVI", [
        { value: "regular", label: "Regular" },
        { value: "ukvi", label: "UKVI" },
      ])}
      {field(
        "type",
        "Test type",
        "test_type",
        "All test types",
        typeOptions.map((t) => ({ value: t.code, label: t.name })),
      )}
      {field("format", "Format", "test_format", "Any format", FORMATS)}
      {!lockCity &&
        field(
          "city",
          "City",
          "city",
          "All cities",
          cities.map((c) => ({ value: c.slug, label: c.name })),
        )}
      {field(
        "month",
        "Month",
        "month",
        "Any month",
        months.map((m) => ({ value: m.value, label: m.label })),
      )}
    </div>
  );

  if (mode === "submit") {
    return (
      <form action={basePath} method="get" role="search" aria-label="Search test dates">
        {fields}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary min-w-48">
            Search available dates
          </button>
          {active > 0 && (
            <button
              type="button"
              className="text-crimson text-[0.9375rem] font-semibold underline underline-offset-4"
              onClick={() => setDraft({})}
            >
              Clear
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form role="search" aria-label="Filter test dates" onSubmit={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between md:hidden">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-expanded={open}
          aria-controls="date-filters"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide filters" : `Filters${active ? ` (${active})` : ""}`}
        </button>
        <span className="text-muted text-sm" role="status" aria-live="polite">
          {pending ? "Updating…" : ""}
        </span>
      </div>
      <div id="date-filters" className={`${open ? "block" : "hidden"} mt-3 md:mt-0 md:block`}>
        {fields}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[0.9375rem]">
            <input
              type="checkbox"
              checked={f.hide_closed === "true"}
              onChange={(e) => set({ hide_closed: e.target.checked ? "true" : "" })}
              className="accent-crimson h-4 w-4"
            />
            Hide dates that are closed
          </label>
          {active > 0 && (
            <button
              type="button"
              className="text-crimson text-[0.9375rem] font-semibold underline underline-offset-4"
              onClick={() => push({})}
            >
              Clear all filters
            </button>
          )}
          <span className="text-muted hidden text-sm md:inline" role="status" aria-live="polite">
            {pending ? "Updating…" : ""}
          </span>
        </div>
      </div>
    </form>
  );
}
