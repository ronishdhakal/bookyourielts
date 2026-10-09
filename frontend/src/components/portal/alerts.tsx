"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, alertApi, catalogApi, type AlertInput } from "@/lib/api";
import { FORMAT_LABELS, formatDate, monthLabel, monthOptions } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { DateAlert } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { usePortalData } from "./portal-data";
import { ErrorNoteSimple } from "./simple";

const PROVIDER = { british_council: "British Council", idp: "IDP" } as const;

function describe(
  a: DateAlert,
  typeNames: Record<string, string>,
  cityNames: Record<string, string>,
): string {
  const parts = [
    a.provider && PROVIDER[a.provider],
    a.category === "ukvi" ? "UKVI" : a.category === "regular" ? "Regular" : "",
    a.test_type && (typeNames[a.test_type] ?? a.test_type),
    a.test_format && FORMAT_LABELS[a.test_format],
    a.city && (cityNames[a.city] ?? a.city),
    a.month && monthLabel(a.month),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Any open IELTS date";
}

function queryFor(a: DateAlert): string {
  const sp = new URLSearchParams();
  if (a.provider) sp.set("provider", a.provider);
  if (a.category) sp.set("category", a.category);
  if (a.test_type) sp.set("test_type", a.test_type);
  if (a.test_format) sp.set("test_format", a.test_format);
  if (a.city) sp.set("city", a.city);
  if (a.month) sp.set("month", a.month);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function Alerts() {
  const { alerts, error, reload } = usePortalData();
  const cities = useLoader("cities", () => catalogApi.cities());
  const types = useLoader("types", () => catalogApi.testTypes());
  const [draft, setDraft] = useState<AlertInput>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const months = monthOptions(10);
  const typeNames = Object.fromEntries((types.data ?? []).map((t) => [t.code, t.name]));
  const cityNames = Object.fromEntries((cities.data ?? []).map((c) => [c.slug, c.name]));
  const typeOptions = (types.data ?? []).filter(
    (t) => !draft.category || t.is_ukvi === (draft.category === "ukvi"),
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await alertApi.create({
        ...draft,
        test_type: draft.test_type || null,
        city: draft.city || null,
      });
      setDraft({});
      reload();
    } catch (er) {
      setFormError(er instanceof ApiError ? er.message : "Could not save the alert.");
    }
    setBusy(false);
  }

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      reload();
    } catch (er) {
      setFormError(er instanceof ApiError ? er.message : "Something went wrong.");
    }
  }

  const sel = (
    id: string,
    label: string,
    key: keyof AlertInput,
    any: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="min-w-0">
      <label htmlFor={`al-${id}`} className="field-label">
        {label}
      </label>
      <select
        id={`al-${id}`}
        className="field-input"
        value={(draft[key] as string | null) ?? ""}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Date alerts</h1>
        <p className="text-muted mt-1 max-w-2xl">
          Save what you are looking for. Whenever a matching date opens it shows up here and in your
          notifications, so you never have to keep checking.
        </p>
      </div>

      <form onSubmit={create} className="panel panel-pad mb-6 !p-5" aria-label="New alert">
        <h2 className="mb-4 text-lg font-bold">New alert</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {sel("provider", "Provider", "provider", "Any provider", [
            { value: "british_council", label: "British Council IELTS" },
            { value: "idp", label: "IDP IELTS" },
          ])}
          {sel("category", "IELTS exam", "category", "Regular and UKVI", [
            { value: "regular", label: "Regular" },
            { value: "ukvi", label: "UKVI" },
          ])}
          {sel(
            "type",
            "Test type",
            "test_type",
            "Any test type",
            typeOptions.map((t) => ({ value: t.code, label: t.name })),
          )}
          {sel("format", "Format", "test_format", "Any format", [
            { value: "computer", label: "Computer-delivered" },
            { value: "computer_wop", label: "Computer with Writing on Paper" },
          ])}
          {sel(
            "city",
            "City",
            "city",
            "Any city",
            (cities.data ?? []).map((c) => ({ value: c.slug, label: c.name })),
          )}
          {sel("month", "Month", "month", "Any month", months)}
        </div>
        {formError && (
          <p role="alert" className="field-error mt-3">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn-dark mt-4" disabled={busy}>
          {busy ? "Saving…" : "Save alert"}
        </button>
      </form>

      {error && <ErrorNoteSimple message={error} onRetry={reload} />}
      {!alerts ? (
        <div className="skeleton-light h-32 rounded-lg" role="status" aria-label="Loading alerts" />
      ) : alerts.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <h2 className="text-xl font-bold">No alerts yet</h2>
          <p className="text-muted mt-1">Save one above, or from the Find a date page.</p>
        </div>
      ) : (
        <ul className="panel divide-mist divide-y overflow-hidden">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`grid items-center gap-x-6 gap-y-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] ${a.is_active ? "" : "bg-[#f7f8fa]"}`}
            >
              <div className="min-w-0">
                <p className={`font-semibold ${a.is_active ? "" : "text-muted"}`}>
                  {describe(a, typeNames, cityNames)}
                </p>
                <p className="text-muted text-[0.875rem]">
                  {a.is_active
                    ? a.matches > 0
                      ? `${a.matches} open ${a.matches === 1 ? "date" : "dates"}${a.next_date ? ` · next ${formatDate(a.next_date, { weekday: "short" })}` : ""}`
                      : "No open date yet. We will tell you when one appears."
                    : "Paused"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {a.is_active && a.new_matches > 0 && (
                  <span className="bg-crimson rounded-full px-2.5 py-1 text-xs font-semibold text-white">
                    {a.new_matches} new
                  </span>
                )}
                {a.is_active && a.matches > 0 && (
                  <Link
                    href={portalHref(`/dates${queryFor(a)}`)}
                    onClick={() => void alertApi.seen(a.id).then(reload, () => undefined)}
                    className="btn btn-primary btn-sm"
                  >
                    View dates
                  </Link>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void act(() => alertApi.update(a.id, { is_active: !a.is_active }))}
                >
                  {a.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  aria-label="Delete alert"
                  onClick={() => void act(() => alertApi.remove(a.id))}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
