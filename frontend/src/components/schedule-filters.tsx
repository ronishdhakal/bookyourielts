"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { monthOptions } from "@/lib/format";
import type { City, SessionFilters, TestType } from "@/lib/types";

const FORMATS = [
  { value: "computer", label: "Computer-delivered" },
  { value: "computer_wop", label: "Computer with Writing on Paper" },
];

export function ScheduleFilters({
  basePath,
  cities,
  types,
  current,
  lockCity = false,
}: {
  basePath: string;
  cities: City[];
  types: TestType[];
  current: SessionFilters;
  /** On a city page the city is fixed by the URL. */
  lockCity?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const months = monthOptions(8);

  const activeCount = [
    !lockCity && current.city,
    current.test_type,
    current.test_format,
    current.month,
    current.hide_closed,
  ].filter(Boolean).length;

  function apply(next: SessionFilters) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (k === "page") continue;
      if (v && !(lockCity && k === "city")) sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  }

  const change =
    (key: keyof SessionFilters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      const value =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? e.target.checked
            ? "true"
            : ""
          : e.target.value;
      apply({ ...current, [key]: value });
    };

  return (
    <form
      method="get"
      action={basePath}
      role="search"
      aria-label="Filter test dates"
      className="bg-paper border-mist z-30 border-b py-3 md:sticky md:top-16"
    >
      <div className="flex items-center justify-between md:hidden">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-expanded={open}
          aria-controls="filter-fields"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
        </button>
        <span className="text-muted text-sm" role="status" aria-live="polite">
          {pending ? "Updating…" : ""}
        </span>
      </div>

      <div
        id="filter-fields"
        className={`${open ? "grid" : "hidden"} xs:grid-cols-2 mt-3 grid-cols-1 gap-3 md:mt-0 md:grid md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end`}
      >
        {!lockCity && (
          <Select
            label="City"
            name="city"
            value={current.city ?? ""}
            onChange={change("city")}
            anyLabel="All cities"
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Select
          label="Test type"
          name="test_type"
          value={current.test_type ?? ""}
          onChange={change("test_type")}
          anyLabel="All test types"
        >
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          label="Format"
          name="test_format"
          value={current.test_format ?? ""}
          onChange={change("test_format")}
          anyLabel="Any format"
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <Select
          label="Month"
          name="month"
          value={current.month ?? ""}
          onChange={change("month")}
          anyLabel="Any month"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <div className="xs:col-span-2 flex min-h-12 items-center gap-4 md:col-span-1">
          <label className="flex min-h-12 cursor-pointer items-center gap-2 text-[0.9375rem]">
            <input
              type="checkbox"
              name="hide_closed"
              value="true"
              checked={current.hide_closed === "true"}
              onChange={change("hide_closed")}
              className="accent-crimson h-5 w-5"
            />
            Hide closed
          </label>
          {activeCount > 0 && (
            <button
              type="button"
              className="text-crimson text-[0.9375rem] font-semibold underline underline-offset-4"
              onClick={() => apply({})}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <noscript>
        <button type="submit" className="btn btn-primary btn-sm mt-3">
          Show dates
        </button>
      </noscript>
      <div
        className={`bg-crimson h-0.5 transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}
        aria-hidden
      />
    </form>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  anyLabel,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  anyLabel: string;
  children: React.ReactNode;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label !mb-1 text-[0.8125rem]">
        {label}
      </label>
      <select id={id} name={name} value={value} onChange={onChange} className="field-input">
        <option value="">{anyLabel}</option>
        {children}
      </select>
    </div>
  );
}
