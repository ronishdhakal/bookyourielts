"use client";

import { ProviderLogo } from "../provider-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, catalogApi, manageApi } from "@/lib/api";
import { formatDate, formatNpr } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { StaffSession } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useQueryState } from "@/lib/use-query-state";
import { SeatChip } from "../seat-chip";
import { TextField } from "../text-field";
import { useStats } from "./manage-shell";
import { EmptyRow, ErrorNote, PageTitle, Pager, SkeletonRows, Tabs } from "./ui";

const PAGE = 24;

function SeatBar({ s }: { s: StaffSession }) {
  const pct = s.seats_total ? Math.min(100, Math.round((s.seats_booked / s.seats_total) * 100)) : 0;
  return (
    <div className="min-w-24">
      <p className="font-mono text-[0.8125rem]">
        {s.seats_booked} / {s.seats_total}
      </p>
      <div className="bg-mist mt-1 h-1.5 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-spruce h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DatesAdmin() {
  const q = useQueryState();
  const { reload: reloadStats } = useStats();
  const when = q.get("when") || "upcoming";
  const page = Number(q.get("page") || 1);
  const cities = useLoader("cities", () => catalogApi.cities());
  const list = useLoader(`dates|${q.key}`, (signal) =>
    manageApi.sessions(
      { when, city: q.get("city"), provider: q.get("provider"), visible: q.get("visible"), page },
      signal,
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const pageIds = list.data?.results.map((s) => s.id) ?? [];
  const allPicked = pageIds.length > 0 && pageIds.every((id) => picked.includes(id));
  const togglePick = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function bulk(action: "delete" | "hide" | "show") {
    setBulkBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await manageApi.bulkSessions(picked, action);
      setInfo(
        action === "delete"
          ? `${r.deleted ?? 0} deleted.${r.skipped ? ` ${r.skipped} kept because they have booking requests (hide them instead).` : ""}`
          : `${r.updated ?? 0} ${action === "hide" ? "hidden" : "now shown"}.`,
      );
      setPicked([]);
      setAskDelete(false);
      list.reload();
      reloadStats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the selected dates.");
    }
    setBulkBusy(false);
  }

  async function toggle(s: StaffSession) {
    setError(null);
    try {
      await manageApi.updateSession(s.id, { is_visible: !s.is_visible });
      list.reload();
      reloadStats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change visibility.");
    }
  }

  return (
    <>
      <PageTitle
        title="Test dates"
        lede="Dates students can book. Hidden dates are kept but not shown on the website."
        actions={
          <>
            <Link href={portalHref("/manage/dates/bulk")} className="btn btn-outline btn-sm">
              Add many dates
            </Link>
            <Link href={portalHref("/manage/dates/new")} className="btn btn-primary btn-sm">
              Add a date
            </Link>
          </>
        }
      />
      <Tabs
        label="Which dates"
        value={when as "upcoming" | "past" | "all"}
        onChange={(v) => q.set({ when: v === "upcoming" ? "" : v })}
        items={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
          { value: "all", label: "All" },
        ]}
      />
      <div className="my-4 flex flex-wrap gap-3">
        <select
          aria-label="City"
          className="field-input !min-h-11 !w-auto"
          value={q.get("city")}
          onChange={(e) => q.set({ city: e.target.value })}
        >
          <option value="">All cities</option>
          {cities.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Provider"
          className="field-input !min-h-11 !w-auto"
          value={q.get("provider")}
          onChange={(e) => q.set({ provider: e.target.value })}
        >
          <option value="">All providers</option>
          <option value="british_council">British Council</option>
          <option value="idp">IDP</option>
        </select>
        <select
          aria-label="Visibility"
          className="field-input !min-h-11 !w-auto"
          value={q.get("visible")}
          onChange={(e) => q.set({ visible: e.target.value })}
        >
          <option value="">Shown and hidden</option>
          <option value="true">Shown only</option>
          <option value="false">Hidden only</option>
        </select>
      </div>
      {error && <ErrorNote message={error} />}
      {info && (
        <p role="status" className="mb-3 font-semibold">
          {info}
        </p>
      )}
      {picked.length > 0 && (
        <div
          role="region"
          aria-label="Selected dates"
          className="bg-ink mb-3 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-white"
        >
          <p className="font-semibold">{picked.length} selected</p>
          {askDelete ? (
            <div
              role="alertdialog"
              aria-label="Confirm delete"
              className="flex flex-wrap items-center gap-3"
            >
              <span>
                Delete {picked.length === 1 ? "this date" : `these ${picked.length} dates`}? This
                cannot be undone.
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={bulkBusy}
                onClick={() => void bulk("delete")}
              >
                {bulkBusy ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                className="btn btn-sm border-white/40 text-white"
                onClick={() => setAskDelete(false)}
              >
                Keep
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-sm border-white/40 text-white"
                disabled={bulkBusy}
                onClick={() => void bulk("hide")}
              >
                Hide
              </button>
              <button
                type="button"
                className="btn btn-sm border-white/40 text-white"
                disabled={bulkBusy}
                onClick={() => void bulk("show")}
              >
                Show
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={bulkBusy}
                onClick={() => setAskDelete(true)}
              >
                Delete selected
              </button>
              <button
                type="button"
                className="ml-auto text-sm underline"
                onClick={() => setPicked([])}
              >
                Clear selection
              </button>
            </>
          )}
        </div>
      )}

      {list.error ? (
        <ErrorNote message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <SkeletonRows />
      ) : !list.data || list.data.results.length === 0 ? (
        <EmptyRow title="No dates match" text="Add a date, or change the filters." />
      ) : (
        <div className={`panel overflow-hidden ${list.refreshing ? "opacity-70" : ""}`}>
          <table className="hidden w-full text-left text-[0.9375rem] md:table">
            <caption className="sr-only">Test dates</caption>
            <thead className="border-mist bg-ink/[0.03] text-muted border-b text-[0.8125rem]">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all dates on this page"
                    className="accent-crimson h-4.5 w-4.5"
                    checked={allPicked}
                    onChange={() =>
                      setPicked(
                        allPicked
                          ? picked.filter((id) => !pageIds.includes(id))
                          : [...new Set([...picked, ...pageIds])],
                      )
                    }
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Exam</th>
                <th className="px-3 py-3 font-semibold">City</th>
                <th className="px-3 py-3 font-semibold">Fee</th>
                <th className="px-3 py-3 font-semibold">Seats</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Shown</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-mist divide-y">
              {list.data.results.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-ink/[0.03] ${s.is_visible ? "" : "text-muted"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${formatDate(s.date)} ${s.city_name}`}
                      className="accent-crimson h-4.5 w-4.5"
                      checked={picked.includes(s.id)}
                      onChange={() => togglePick(s.id)}
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <p className="font-semibold">
                      {formatDate(s.date, { weekday: "short", year: undefined })}
                    </p>
                    <p className="text-muted text-[0.8125rem]">{s.date.slice(0, 4)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="flex items-center gap-2">
                      <ProviderLogo provider={s.provider} label={s.provider_label} height={22} />
                      <span>{s.test_type_name}</span>
                    </p>
                    <p className="text-muted text-[0.8125rem]">
                      {s.format === "computer" ? "Computer" : "Computer + paper Writing"}
                    </p>
                  </td>
                  <td className="px-3 py-3">{s.city_name}</td>
                  <td className="px-3 py-3 font-mono text-[0.8125rem] whitespace-nowrap">
                    {formatNpr(s.fee_npr)}
                  </td>
                  <td className="px-3 py-3">
                    <SeatBar s={s} />
                  </td>
                  <td className="px-3 py-3">
                    <SeatChip tone="light" status={s.seat_status} />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.is_visible}
                      aria-label={`${s.is_visible ? "Hide" : "Show"} ${formatDate(s.date)} ${s.city_name}`}
                      onClick={() => void toggle(s)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${s.is_visible ? "bg-spruce" : "bg-[#aab1bb]"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.is_visible ? "left-[22px]" : "left-0.5"}`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={portalHref(`/manage/dates/${s.id}`)}
                      className="text-crimson font-semibold underline underline-offset-4"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-mist divide-y md:hidden">
            {list.data.results.map((s) => (
              <li key={s.id} className={`px-4 py-3.5 ${s.is_visible ? "" : "bg-ink/[0.03]"}`}>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    aria-label={`Select ${formatDate(s.date)} ${s.city_name}`}
                    className="accent-crimson h-4.5 w-4.5"
                    checked={picked.includes(s.id)}
                    onChange={() => togglePick(s.id)}
                  />
                  Select
                </label>
                <div className="flex items-start justify-between gap-3">
                  <Link href={portalHref(`/manage/dates/${s.id}`)} className="min-w-0">
                    <p className="font-semibold">
                      {formatDate(s.date, { weekday: "short" })} · {s.city_name}
                    </p>
                    <p className="text-muted text-[0.875rem]">
                      {s.test_type_name} · {s.provider_label}
                    </p>
                  </Link>
                  <SeatChip tone="light" status={s.seat_status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <SeatBar s={s} />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void toggle(s)}
                  >
                    {s.is_visible ? "Hide" : "Show"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {list.data && (
        <Pager
          page={page}
          count={list.data.count}
          size={PAGE}
          onPage={(p) => q.set({ page: String(p) })}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ add / edit */
interface Form {
  date: string;
  provider: string;
  city: string;
  test_type: string;
  format: string;
  fee_npr: string;
  seats_total: string;
  registration_closes_on: string;
  results_date: string;
  speaking_note: string;
  is_visible: boolean;
  notes: string;
}

const EMPTY: Form = {
  date: "",
  provider: "british_council",
  city: "",
  test_type: "",
  format: "computer",
  fee_npr: "",
  seats_total: "",
  registration_closes_on: "",
  results_date: "",
  speaking_note: "",
  is_visible: true,
  notes: "",
};

function fromSession(s: StaffSession): Form {
  return {
    date: s.date,
    provider: s.provider,
    city: String(s.city),
    test_type: String(s.test_type),
    format: s.format,
    fee_npr: String(s.fee_npr),
    seats_total: String(s.seats_total),
    registration_closes_on: s.registration_closes_on,
    results_date: s.results_date,
    speaking_note: s.speaking_note,
    is_visible: s.is_visible,
    notes: s.notes,
  };
}

export function DateForm({ id }: { id?: string }) {
  const router = useRouter();
  const { reload: reloadStats } = useStats();
  const meta = useLoader("meta", () => manageApi.meta());
  const existing = useLoader(id ? `date|${id}` : null, () => manageApi.session(id ?? ""));
  const [form, setForm] = useState<Form | null>(id ? null : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const f = form ?? (existing.data ? fromSession(existing.data) : null);
  if (existing.error) return <ErrorNote message={existing.error} onRetry={existing.reload} />;
  if (!f || !meta.data) return <SkeletonRows rows={4} />;
  const m = meta.data;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...f, [k]: v });
  const type = m.test_types.find((t) => String(t.id) === f.test_type);
  const err = (k: string) => errors[k];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    const local: Record<string, string> = {};
    if (!f.date) local.date = "Choose the test date.";
    if (!f.city) local.city = "Choose a city.";
    if (!f.test_type) local.test_type = "Choose a test type.";
    if (f.fee_npr === "" || Number(f.fee_npr) < 0) local.fee_npr = "Enter the fee in NPR.";
    if (f.seats_total === "" || Number(f.seats_total) < 0)
      local.seats_total = "Enter how many seats there are.";
    setErrors(local);
    setMessage(null);
    if (Object.keys(local).length) return;
    const body = {
      date: f.date,
      provider: f.provider,
      city: Number(f.city),
      test_type: Number(f.test_type),
      format: f.format,
      fee_npr: Number(f.fee_npr),
      seats_total: Number(f.seats_total),
      speaking_note: f.speaking_note,
      is_visible: f.is_visible,
      notes: f.notes,
      ...(f.registration_closes_on ? { registration_closes_on: f.registration_closes_on } : {}),
      ...(f.results_date ? { results_date: f.results_date } : {}),
    } as unknown as Partial<StaffSession>;
    setBusy(true);
    try {
      if (id) {
        setForm(fromSession(await manageApi.updateSession(Number(id), body)));
        setMessage("Saved.");
      } else {
        await manageApi.createSession(body);
        reloadStats();
        router.push(portalHref("/manage/dates"));
        return;
      }
      reloadStats();
    } catch (er) {
      if (er instanceof ApiError && Object.keys(er.fields).length) {
        setErrors(Object.fromEntries(Object.entries(er.fields).map(([k, v]) => [k, v[0] ?? ""])));
        if (er.fields.detail) setMessage(er.fields.detail[0] ?? null);
      } else setMessage(er instanceof ApiError ? er.message : "Could not save.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!id) return;
    setBusy(true);
    try {
      await manageApi.deleteSession(Number(id));
      reloadStats();
      router.push(portalHref("/manage/dates"));
    } catch (er) {
      setMessage(er instanceof ApiError ? er.message : "Could not delete.");
      setConfirmDelete(false);
      setBusy(false);
    }
  }

  const sel = (
    name: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { v: string; l: string; disabled?: boolean }[],
    opts?: { blank?: string; required?: boolean },
  ) => (
    <div>
      <label htmlFor={`f-${name}`} className="field-label">
        {label}
        {opts?.required && <span className="text-crimson"> *</span>}
      </label>
      <select
        id={`f-${name}`}
        className="field-input"
        value={value}
        aria-invalid={err(name) ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts?.blank !== undefined && <option value="">{opts.blank}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v} disabled={o.disabled}>
            {o.l}
          </option>
        ))}
      </select>
      {err(name) && (
        <p className="field-error" role="alert">
          {err(name)}
        </p>
      )}
    </div>
  );

  return (
    <>
      <p className="mb-2 text-[0.9375rem]">
        <Link
          href={portalHref("/manage/dates")}
          className="text-muted underline underline-offset-4"
        >
          ← Test dates
        </Link>
      </p>
      <PageTitle
        title={id ? "Edit test date" : "Add a test date"}
        lede={
          id && existing.data
            ? `${existing.data.booking_count} active booking requests on this date.`
            : undefined
        }
      />

      <form onSubmit={save} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="panel panel-pad">
            <h2 className="mb-4 text-lg font-bold">When and where</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="f-date" className="field-label">
                  Test date <span className="text-crimson">*</span>
                </label>
                <input
                  id="f-date"
                  type="date"
                  className="field-input"
                  value={f.date}
                  onChange={(e) => set("date", e.target.value)}
                  aria-invalid={err("date") ? true : undefined}
                />
                {err("date") && (
                  <p className="field-error" role="alert">
                    {err("date")}
                  </p>
                )}
              </div>
              {sel(
                "provider",
                "Provider",
                f.provider,
                (v) => set("provider", v),
                m.providers.map((p) => ({ v: p.value, l: p.label })),
              )}
              {sel(
                "city",
                "City",
                f.city,
                (v) => set("city", v),
                m.cities.map((c) => ({ v: String(c.id), l: c.name })),
                { blank: "Select a city", required: true },
              )}
            </div>
          </section>

          <section className="panel panel-pad">
            <h2 className="mb-4 text-lg font-bold">Test and fee</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {sel(
                "test_type",
                "Test type",
                f.test_type,
                (v) => set("test_type", v),
                m.test_types.map((t) => ({ v: String(t.id), l: t.name })),
                { blank: "Select a test type", required: true },
              )}
              {sel(
                "format",
                "Format",
                f.format,
                (v) => set("format", v),
                m.formats.map((x) => ({
                  v: x.value,
                  l: x.label,
                  disabled: !!type?.is_ukvi && x.value === "computer_wop",
                })),
              )}
              <TextField
                label="Fee (NPR)"
                type="number"
                inputMode="numeric"
                min={0}
                value={f.fee_npr}
                onChange={(v) => set("fee_npr", v)}
                error={err("fee_npr")}
                required
              />
              <TextField
                label="Seats in total"
                type="number"
                inputMode="numeric"
                min={0}
                value={f.seats_total}
                onChange={(v) => set("seats_total", v)}
                error={err("seats_total")}
                hint={
                  id && existing.data
                    ? `${existing.data.seats_booked} already confirmed`
                    : undefined
                }
                required
              />
            </div>
          </section>

          <section className="panel panel-pad">
            <h2 className="mb-1 text-lg font-bold">Deadlines</h2>
            <p className="text-muted mb-4 text-[0.9375rem]">
              Leave empty to fill in automatically: registration closes 6 days before, results 5
              days after (13 for Writing on Paper).
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="f-close" className="field-label">
                  Registration closes on
                </label>
                <input
                  id="f-close"
                  type="date"
                  className="field-input"
                  value={f.registration_closes_on}
                  onChange={(e) => set("registration_closes_on", e.target.value)}
                />
                {err("registration_closes_on") && (
                  <p className="field-error" role="alert">
                    {err("registration_closes_on")}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="f-results" className="field-label">
                  Results from
                </label>
                <input
                  id="f-results"
                  type="date"
                  className="field-input"
                  value={f.results_date}
                  onChange={(e) => set("results_date", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  label="Speaking test note"
                  value={f.speaking_note}
                  onChange={(v) => set("speaking_note", v)}
                  hint="Shown to students. Example: Speaking is a separate slot within 7 days before or after."
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="panel panel-pad">
            <h2 className="text-lg font-bold">Visibility</h2>
            <label className="mt-3 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="accent-crimson mt-1 h-5 w-5"
                checked={f.is_visible}
                onChange={(e) => set("is_visible", e.target.checked)}
              />
              <span>
                <span className="block font-semibold">Show on the website</span>
                <span className="text-muted block text-[0.875rem]">
                  Untick to keep it private while you prepare it.
                </span>
              </span>
            </label>
            <label htmlFor="f-notes" className="field-label mt-5">
              Internal notes
            </label>
            <textarea
              id="f-notes"
              rows={4}
              className="field-input py-3"
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
            <p className="text-muted mt-1 text-[0.8125rem]">Never shown to students.</p>
          </section>

          <section className="panel panel-pad">
            {message && (
              <p
                role={message === "Saved." ? "status" : "alert"}
                className={`mb-3 font-semibold ${message === "Saved." ? "text-ok" : "text-crimson"}`}
              >
                {message}
              </p>
            )}
            {Object.keys(errors).length > 0 && !message && (
              <p role="alert" className="text-crimson mb-3 font-semibold">
                Please fix the highlighted fields.
              </p>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? "Saving…" : id ? "Save changes" : "Add date"}
            </button>
            {id &&
              (confirmDelete ? (
                <div
                  role="alertdialog"
                  aria-label="Confirm delete"
                  className="border-crimson mt-3 rounded-lg border-2 p-3"
                >
                  <p className="font-semibold">Delete this date?</p>
                  <p className="text-muted text-[0.875rem]">
                    This cannot be undone. Dates with booking requests cannot be deleted; hide them
                    instead.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => void remove()}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline mt-3 w-full"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete date
                </button>
              ))}
          </section>
        </aside>
      </form>
    </>
  );
}
