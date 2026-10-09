"use client";

import { ProviderLogo } from "../provider-logo";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ApiError, alertApi, catalogApi } from "@/lib/api";
import {
  FORMAT_SHORT,
  formatDate,
  formatLong,
  formatNpr,
  monthLabel,
  monthOptions,
} from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import type { TestSession } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useQueryState } from "@/lib/use-query-state";
import { SeatChip } from "../seat-chip";
import { BookingDrawer } from "./booking-drawer";
import { usePortalData } from "./portal-data";

const FORMATS = [
  { value: "computer", label: "Computer-delivered" },
  { value: "computer_wop", label: "Computer with Writing on Paper" },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

function SeatMeter({ s }: { s: TestSession }) {
  const pct = s.seats_total ? Math.max(4, Math.round((s.seats_left / s.seats_total) * 100)) : 4;
  return (
    <div className="min-w-28">
      <p className="text-[0.8125rem] font-medium">
        {s.seats_left} of {s.seats_total} seats left
      </p>
      <div className="bg-mist mt-1 h-1.5 overflow-hidden rounded-full" aria-hidden>
        <div
          className={`h-full rounded-full ${s.seat_status === "few_left" ? "bg-crimson" : "bg-ink"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function FindDates() {
  const q = useQueryState();
  const { alerts, reload } = usePortalData();
  const cities = useLoader("cities", () => catalogApi.cities());
  const types = useLoader("types", () => catalogApi.testTypes());
  const view = q.get("view") === "month" ? "month" : "list";
  const category = q.get("category");
  const month = q.get("month");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const drawerId = /^\d+$/.test(q.get("session")) ? Number(q.get("session")) : null;
  const months = monthOptions(10);
  const calendarMonth = month || new Date().toISOString().slice(0, 7);

  const filterKey = ["provider", "category", "test_type", "test_format", "city", "month"]
    .map((k) => q.get(k))
    .join("|");
  const results = useLoader(
    `find|${view}|${filterKey}|${view === "month" ? calendarMonth : ""}`,
    (signal) =>
      catalogApi.sessions(
        {
          provider: q.get("provider"),
          category,
          test_type: q.get("test_type"),
          test_format: q.get("test_format"),
          city: q.get("city"),
          month: view === "month" ? calendarMonth : month,
          hide_closed: "true",
          page_size: "100",
        },
        signal,
      ),
  );

  const typeOptions = (types.data ?? []).filter(
    (t) => !category || t.is_ukvi === (category === "ukvi"),
  );
  const rows = useMemo(
    () => (results.data?.results ?? []).filter((s) => s.is_bookable || view === "list"),
    [results.data, view],
  );
  const active = ["provider", "category", "test_type", "test_format", "city", "month"].filter((k) =>
    q.get(k),
  ).length;
  const alreadyAlert = (alerts ?? []).some(
    (a) =>
      a.is_active &&
      a.provider === q.get("provider") &&
      a.category === category &&
      (a.test_type ?? "") === q.get("test_type") &&
      a.test_format === q.get("test_format") &&
      (a.city ?? "") === q.get("city") &&
      a.month === month,
  );

  async function saveAlert() {
    setMsg(null);
    try {
      await alertApi.create({
        provider: q.get("provider"),
        category,
        test_type: q.get("test_type") || null,
        test_format: q.get("test_format"),
        city: q.get("city") || null,
        month,
      });
      reload();
      setMsg({ kind: "ok", text: "Alert saved. New matching dates will appear under Alerts." });
    } catch (e) {
      setMsg({
        kind: "err",
        text: e instanceof ApiError ? e.message : "Could not save the alert.",
      });
    }
  }

  const select = (
    id: string,
    label: string,
    key: string,
    any: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="min-w-0">
      <label htmlFor={`fd-${id}`} className="field-label">
        {label}
      </label>
      <select
        id={`fd-${id}`}
        className="field-input"
        value={q.get(key)}
        onChange={(e) => q.set({ [key]: e.target.value })}
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

  // Group the list by month
  const groups = new Map<string, TestSession[]>();
  for (const s of rows)
    groups.set(s.date.slice(0, 7), [...(groups.get(s.date.slice(0, 7)) ?? []), s]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Find a date</h1>
          <p className="text-muted mt-1">
            Browse every open date, then book it in a panel. Only the city is fixed on a date: your
            session and venue are confirmed by our team after you book.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="View"
          className="border-mist inline-flex overflow-hidden rounded-lg border bg-white"
        >
          {(
            [
              ["list", "List"],
              ["month", "Month"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              type="button"
              onClick={() => q.set({ view: v === "list" ? "" : v, day: "" })}
              className={`min-h-10 px-5 text-[0.9375rem] font-semibold ${view === v ? "bg-ink text-white" : "hover:bg-black/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="panel panel-pad mb-6 !p-5" aria-label="Filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {select("provider", "Provider", "provider", "Any provider", [
            { value: "british_council", label: "British Council IELTS" },
            { value: "idp", label: "IDP IELTS" },
          ])}
          {select("category", "IELTS exam", "category", "Regular and UKVI", [
            { value: "regular", label: "Regular" },
            { value: "ukvi", label: "UKVI" },
          ])}
          {select(
            "type",
            "Test type",
            "test_type",
            "All test types",
            typeOptions.map((t) => ({ value: t.code, label: t.name })),
          )}
          {select("format", "Format", "test_format", "Any format", FORMATS)}
          {select(
            "city",
            "City",
            "city",
            "All cities",
            (cities.data ?? []).map((c) => ({ value: c.slug, label: c.name })),
          )}
          {select("month", "Month", "month", "Any month", months)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {active > 0 && (
            <button
              type="button"
              className="text-crimson text-[0.9375rem] font-semibold underline underline-offset-4"
              onClick={() =>
                q.set({
                  provider: "",
                  category: "",
                  test_type: "",
                  test_format: "",
                  city: "",
                  month: "",
                })
              }
            >
              Clear filters
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline btn-sm ml-auto"
            onClick={saveAlert}
            disabled={alreadyAlert}
          >
            {alreadyAlert ? "Alert saved for this search" : "Notify me about this search"}
          </button>
        </div>
        {msg && (
          <p
            role={msg.kind === "ok" ? "status" : "alert"}
            className={`mt-3 text-[0.9375rem] font-medium ${msg.kind === "ok" ? "" : "text-crimson"}`}
          >
            {msg.text}{" "}
            {msg.kind === "ok" && (
              <Link href={portalHref("/alerts")} className="text-crimson underline">
                View alerts
              </Link>
            )}
          </p>
        )}
      </section>

      {results.error ? (
        <div role="alert" className="border-crimson rounded-lg border-2 px-4 py-3 font-medium">
          {results.error}{" "}
          <button type="button" className="text-crimson underline" onClick={results.reload}>
            Try again
          </button>
        </div>
      ) : results.loading ? (
        <div className="space-y-2" role="status" aria-label="Loading dates">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-light h-20 rounded-lg" />
          ))}
        </div>
      ) : view === "month" ? (
        <MonthView
          month={calendarMonth}
          sessions={rows}
          onMonth={(m) => q.set({ month: m, day: "" })}
          selectedDay={q.get("day")}
          onDay={(d) => q.set({ day: d })}
          onSelect={(id) => q.set({ session: String(id) })}
        />
      ) : rows.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <h2 className="text-xl font-bold">No dates match these filters</h2>
          <p className="text-muted mx-auto mt-1 max-w-md">
            Dates are released in batches. Save an alert and you will see new matches here as soon
            as they open.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveAlert}
              disabled={alreadyAlert}
            >
              {alreadyAlert ? "Alert saved" : "Notify me when a date opens"}
            </button>
            <a href={siteHref("/inquire")} className="btn btn-outline">
              Send an inquiry
            </a>
          </div>
        </div>
      ) : (
        <div className={results.refreshing ? "opacity-70" : ""}>
          <p className="text-muted mb-3 text-[0.9375rem]" role="status">
            {results.data?.count} {results.data?.count === 1 ? "date" : "dates"}
            {(results.data?.count ?? 0) > rows.length && ` · showing the first ${rows.length}`}
          </p>
          {[...groups.entries()].map(([m, list]) => (
            <section key={m} className="mb-8" aria-label={monthLabel(m)}>
              <h2 className="mb-2 text-lg font-bold">{monthLabel(m)}</h2>
              <ul className="panel divide-mist divide-y overflow-hidden">
                {list.map((s) => (
                  <li
                    key={s.id}
                    className="grid items-center gap-x-6 gap-y-3 px-5 py-4 hover:bg-[#fafbfc] md:grid-cols-[9.5rem_minmax(0,1fr)_8rem_7rem_auto]"
                  >
                    <div>
                      <p className="font-bold">
                        {formatDate(s.date, { weekday: "short", year: undefined })}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        <ProviderLogo provider={s.provider} label={s.provider_label} height={28} />
                        <span>{s.test_type.name}</span>
                      </p>
                      <p className="text-muted text-[0.875rem]">
                        {s.city.name} · {FORMAT_SHORT[s.format]}
                      </p>
                      <p className="text-muted text-[0.8125rem]">
                        Register by {formatDate(s.registration_closes_on, { year: undefined })}
                      </p>
                    </div>
                    <SeatMeter s={s} />
                    <p className="font-semibold">{formatNpr(s.fee_npr)}</p>
                    {s.is_bookable ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm md:justify-self-end"
                        onClick={() => q.set({ session: String(s.id) })}
                        aria-label={`Select ${s.test_type.name}, ${s.city.name}, ${formatDate(s.date)}`}
                      >
                        Select
                      </button>
                    ) : (
                      <span className="text-muted text-[0.875rem] font-semibold md:justify-self-end">
                        {s.seat_status_label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <BookingDrawer sessionId={drawerId} onClose={() => q.set({ session: "" })} />
    </>
  );
}

function MonthView({
  month,
  sessions,
  onMonth,
  selectedDay,
  onDay,
  onSelect,
}: {
  month: string;
  sessions: TestSession[];
  onMonth: (m: string) => void;
  selectedDay: string;
  onDay: (d: string) => void;
  onSelect: (id: number) => void;
}) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = (d: number) => {
    const n = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}`;
  };
  const byDay = new Map<string, TestSession[]>();
  for (const s of sessions) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  const cells: (number | null)[] = [
    ...Array(first.getUTCDay()).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const picked = byDay.get(selectedDay) ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="panel p-4 md:p-6" aria-label={monthLabel(month)}>
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={month <= thisMonth}
            onClick={() => onMonth(shift(-1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="text-lg font-bold" aria-live="polite">
            {monthLabel(month)}
          </h2>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onMonth(shift(1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div role="grid" aria-label={monthLabel(month)} className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              role="columnheader"
              className="text-muted pb-1 text-center text-xs font-semibold"
            >
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} role="gridcell" />;
            const date = `${month}-${pad(day)}`;
            const list = byDay.get(date) ?? [];
            const sel = selectedDay === date;
            const scarce = list.some((s) => s.seat_status === "few_left");
            return (
              <div key={date} role="gridcell">
                <button
                  type="button"
                  disabled={list.length === 0}
                  aria-pressed={sel}
                  aria-label={`${day} ${monthLabel(month)}, ${list.length} ${list.length === 1 ? "session" : "sessions"}`}
                  onClick={() => onDay(date)}
                  className={`flex min-h-16 w-full flex-col items-start justify-between rounded-md border p-1.5 text-left md:min-h-20 md:p-2 ${
                    sel
                      ? "border-crimson bg-crimson-tint"
                      : list.length
                        ? "hover:border-ink border-[#c4cad2] bg-white"
                        : "border-transparent bg-[#f7f8fa] text-[#aab1bb]"
                  }`}
                >
                  <span className={`text-sm ${list.length ? "font-bold" : ""}`}>{day}</span>
                  {list.length > 0 && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold ${scarce ? "bg-crimson text-white" : "bg-ink text-white"}`}
                    >
                      {list.length}
                      <span className="hidden md:inline">
                        {" "}
                        {list.length === 1 ? "session" : "sessions"}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-muted mt-4 text-[0.8125rem]">
          The number is how many sessions have seats that day. Red means at least one is nearly
          full.
        </p>
      </section>

      <section className="panel panel-pad !p-5 xl:sticky xl:top-24" aria-live="polite">
        {selectedDay && picked.length > 0 ? (
          <>
            <h2 className="text-lg font-bold">{formatLong(selectedDay)}</h2>
            <ul className="divide-mist mt-3 divide-y">
              {picked.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        <ProviderLogo provider={s.provider} label={s.provider_label} height={28} />
                        <span>{s.test_type.name}</span>
                      </p>
                      <p className="text-muted text-[0.8125rem]">
                        {s.city.name} · {FORMAT_SHORT[s.format]}
                      </p>
                      <p className="text-muted text-[0.8125rem]">{formatNpr(s.fee_npr)}</p>
                    </div>
                    <SeatChip
                      status={s.seat_status}
                      label={s.seat_status === "few_left" ? `${s.seats_left} left` : undefined}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() => onSelect(s.id)}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted">Choose a day with sessions to see its dates and book one.</p>
        )}
      </section>
    </div>
  );
}
