"use client";

import { ProviderLogo } from "../provider-logo";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ApiError, bookingApi } from "@/lib/api";
import { formatDate, formatLong, formatNpr } from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import type { Booking } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { Countdown, STATUS_UI, StatusChip, Tracker, daysUntil } from "./booking-bits";
import { FileDrop } from "./person";
import { usePortalData } from "./portal-data";

/* ------------------------------------------------------------------ list */
export function BookingsList() {
  const { bookings, error, reload } = usePortalData();
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (bookings ?? []).filter((b) => {
      if (filter === "active" && b.status === "cancelled") return false;
      if (filter === "cancelled" && b.status !== "cancelled") return false;
      if (!q) return true;
      return [b.reference, b.candidate_name, b.session.city.name, b.session.test_type.name].some(
        (t) => t.toLowerCase().includes(q),
      );
    });
  }, [bookings, filter, query]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Bookings</h1>
          <p className="text-muted mt-1">
            Every request you have made, with its progress and what is left to do.
          </p>
        </div>
        <Link href={portalHref("/dates")} className="btn btn-primary">
          Find a date
        </Link>
      </div>

      {error ? (
        <div role="alert" className="border-crimson rounded-lg border-2 px-4 py-3 font-medium">
          {error}{" "}
          <button type="button" className="text-crimson underline" onClick={reload}>
            Try again
          </button>
        </div>
      ) : !bookings ? (
        <div className="space-y-3" role="status" aria-label="Loading your bookings">
          <div className="skeleton-light h-20 rounded-lg" />
          <div className="skeleton-light h-20 rounded-lg" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <h2 className="text-xl font-bold">No bookings yet</h2>
          <p className="text-muted mt-1">Pick a date and your request will show up here.</p>
          <Link href={portalHref("/dates")} className="btn btn-primary mt-5">
            Find a date
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Filter bookings"
              className="border-mist inline-flex overflow-hidden rounded-lg border bg-white"
            >
              {(
                [
                  ["all", `All (${bookings.length})`],
                  ["active", "Active"],
                  ["cancelled", "Cancelled"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={filter === v}
                  type="button"
                  onClick={() => setFilter(v)}
                  className={`min-h-10 px-4 text-[0.9375rem] font-semibold ${filter === v ? "bg-ink text-white" : "hover:bg-black/5"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-w-56 flex-1 md:max-w-sm">
              <label htmlFor="bk-search" className="sr-only">
                Search bookings
              </label>
              <input
                id="bk-search"
                type="search"
                className="field-input !min-h-10"
                placeholder="Search reference, name or city"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="text-muted panel px-6 py-10 text-center">
              Nothing matches. Try another filter.
            </p>
          ) : (
            <div className="panel overflow-hidden">
              <table className="hidden w-full text-left text-[0.9375rem] md:table">
                <caption className="sr-only">Your bookings</caption>
                <thead className="border-mist text-muted border-b bg-[#f7f8fa] text-[0.8125rem]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Reference</th>
                    <th className="px-3 py-3 font-semibold">Exam</th>
                    <th className="px-3 py-3 font-semibold">Candidate</th>
                    <th className="px-3 py-3 font-semibold">Test day</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Next step</th>
                  </tr>
                </thead>
                <tbody className="divide-mist divide-y">
                  {shown.map((b) => (
                    <tr key={b.id} className="hover:bg-[#fafbfc]">
                      <td className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                        <Link
                          href={portalHref(`/bookings/${b.id}`)}
                          className="text-crimson underline underline-offset-4"
                        >
                          {b.reference}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="flex items-center gap-2 font-semibold">
                          <ProviderLogo
                            provider={b.session.provider}
                            label={b.session.provider_label}
                            height={28}
                          />
                          <span>{b.session.test_type.name}</span>
                        </p>
                        <p className="text-muted text-[0.8125rem]">{b.session.city.name}</p>
                      </td>
                      <td className="px-3 py-3.5">{b.candidate_name || "—"}</td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {formatDate(b.session.date, { weekday: "short" })}
                        {b.status !== "cancelled" && daysUntil(b.session.date) >= 0 && (
                          <p className="text-muted text-[0.8125rem]">
                            in {daysUntil(b.session.date)} days
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusChip status={b.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-[0.875rem]">
                        {b.change_open ? (
                          "Change requested"
                        ) : b.status !== "cancelled" && !b.has_passport ? (
                          <span className="text-crimson font-semibold">Add passport</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-mist divide-y md:hidden">
                {shown.map((b) => (
                  <li key={b.id}>
                    <Link href={portalHref(`/bookings/${b.id}`)} className="block px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-semibold">
                            <ProviderLogo
                              provider={b.session.provider}
                              label={b.session.provider_label}
                              height={28}
                            />
                            <span>{b.session.test_type.name}</span>
                          </p>
                          <p className="text-muted text-[0.875rem]">
                            {b.session.city.name} ·{" "}
                            {formatDate(b.session.date, { weekday: "short" })}
                          </p>
                        </div>
                        <StatusChip status={b.status} />
                      </div>
                      <p className="text-muted mt-1 text-[0.8125rem]">
                        {b.reference} · {b.candidate_name || "No candidate"}
                        {b.status !== "cancelled" && !b.has_passport && (
                          <span className="text-crimson font-semibold"> · Add passport</span>
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ detail */
function icsFor(b: Booking): string {
  const s = b.session;
  const d = s.date.replaceAll("-", "");
  const slot = b.assigned_slot;
  const times =
    slot === "morning" ? ["090000", "120000"] : slot === "afternoon" ? ["130000", "160000"] : null;
  const next = new Date(`${s.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dayAfter = next.toISOString().slice(0, 10).replaceAll("-", "");
  const esc = (t: string) => t.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//bookyourielts.com//EN",
    "BEGIN:VEVENT",
    `UID:${b.reference}@bookyourielts.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    times ? `DTSTART;TZID=Asia/Kathmandu:${d}T${times[0]}` : `DTSTART;VALUE=DATE:${d}`,
    times ? `DTEND;TZID=Asia/Kathmandu:${d}T${times[1]}` : `DTEND;VALUE=DATE:${dayAfter}`,
    `SUMMARY:${esc(`${s.test_type.name} (${s.city.name})`)}`,
    `LOCATION:${esc(b.assigned_venue || s.city.name)}`,
    `DESCRIPTION:${esc(`Booking ${b.reference}. Bring your original passport. Speaking is a separate slot within about a week.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

const CHECKLIST = [
  "Original passport packed",
  "Booking confirmation saved on my phone",
  "Test centre and route checked",
  "Water bottle without a label",
  "Arrive 30 minutes early",
];

function Checklist({ id }: { id: number }) {
  // Remembered on this device only.
  const key = `byi-checklist-${id}`;
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  function toggle(item: string) {
    const next = done.includes(item) ? done.filter((d) => d !== item) : [...done, item];
    setDone(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* private mode: the checklist still works for this visit */
    }
  }
  return (
    <section className="panel panel-pad !p-5 print:hidden" aria-labelledby="chk">
      <div className="flex items-baseline justify-between">
        <h2 id="chk" className="text-lg font-bold">
          Test day checklist
        </h2>
        <span className="text-muted text-sm">
          {done.length}/{CHECKLIST.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {CHECKLIST.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-center gap-3 text-[0.9375rem]">
              <input
                type="checkbox"
                className="accent-crimson h-5 w-5"
                checked={done.includes(item)}
                onChange={() => toggle(item)}
              />
              <span className={done.includes(item) ? "text-muted line-through" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BookingDetail({ id }: { id: string }) {
  const { reload } = usePortalData();
  const load = useLoader(`booking|${id}`, () => bookingApi.get(id));
  const [override, setOverride] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [msg, setMsg] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const b = override ?? load.data;

  if (load.error)
    return (
      <div className="panel panel-pad text-center">
        <p className="text-2xl font-bold">We could not find that booking</p>
        <Link href={portalHref("/bookings")} className="btn btn-outline mt-4">
          Back to bookings
        </Link>
      </div>
    );
  if (!b)
    return (
      <div className="skeleton-light h-96 rounded-xl" role="status" aria-label="Loading booking" />
    );
  const s = b.session;
  const live = b.status !== "cancelled";

  async function run<T>(fn: () => Promise<T>, done: string, after?: (r: T) => void) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fn();
      after?.(r);
      setNotice(done);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  const resend = async () => {
    try {
      const fresh = await bookingApi.resend(b.id);
      window.open(fresh.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open WhatsApp.");
    }
  };

  function downloadIcs() {
    if (!b) return;
    const url = URL.createObjectURL(new Blob([icsFor(b)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${b.reference}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const detail = (k: string, v: string) => (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted text-[0.9375rem]">{k}</dt>
      <dd className="font-semibold break-words">
        {v || <span className="text-muted font-normal">Not provided</span>}
      </dd>
    </div>
  );

  return (
    <>
      <p className="mb-2 text-[0.9375rem] print:hidden">
        <Link href={portalHref("/bookings")} className="text-muted underline underline-offset-4">
          ← Bookings
        </Link>
      </p>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted text-[0.9375rem]">{b.reference}</p>
          <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <ProviderLogo provider={s.provider} label={s.provider_label} height={36} />
            <span>{s.test_type.name}</span>
          </h1>
          <p className="text-muted">
            {s.city.name} · {s.format_label}
          </p>
        </div>
        <div className="text-right">
          <StatusChip status={b.status} />
          {live && (
            <p className="text-crimson mt-2">
              <Countdown iso={s.date} />
            </p>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="panel panel-pad" aria-label="Progress">
            <Tracker booking={b} />
            <p className="text-muted mt-5 text-[0.9375rem]">{STATUS_UI[b.status].help}</p>
            {(error || notice) && (
              <p
                role={error ? "alert" : "status"}
                className={`mt-3 font-semibold ${error ? "text-crimson" : ""}`}
              >
                {error ?? notice}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3 print:hidden">
              {live && (
                <button type="button" className="btn btn-primary" onClick={() => void resend()}>
                  Continue on WhatsApp
                </button>
              )}
              {live && (
                <button type="button" className="btn btn-outline" onClick={downloadIcs}>
                  Add to calendar
                </button>
              )}
              <button type="button" className="btn btn-outline" onClick={() => window.print()}>
                Print summary
              </button>
              {b.status === "initiated" && !askCancel && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAskCancel(true)}
                >
                  Withdraw request
                </button>
              )}
              {!live && (
                <Link
                  href={portalHref(`/dates?city=${s.city.slug}&test_type=${s.test_type.code}`)}
                  className="btn btn-primary"
                >
                  Book again
                </Link>
              )}
            </div>
            {askCancel && (
              <div
                role="alertdialog"
                aria-label="Confirm withdrawal"
                className="border-crimson mt-4 rounded-lg border-2 p-4"
              >
                <p className="font-semibold">Withdraw this request?</p>
                <p className="text-muted text-[0.9375rem]">
                  You can book the same date again later if seats remain.
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => bookingApi.cancel(b.id),
                        "Request withdrawn.",
                        (r) => {
                          setOverride(r);
                          setAskCancel(false);
                        },
                      )
                    }
                  >
                    {busy ? "Withdrawing…" : "Yes, withdraw"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setAskCancel(false)}
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="panel panel-pad" aria-labelledby="exam-h">
            <h2 id="exam-h" className="mb-1 text-lg font-bold">
              Exam
            </h2>
            <dl className="divide-mist divide-y">
              {detail("Test day", formatLong(s.date))}
              {detail("City", s.city.name)}
              {detail(
                "Session",
                b.assigned_slot
                  ? b.assigned_slot_label
                  : "To be confirmed by our team after booking",
              )}
              {detail("Venue", b.assigned_venue || "To be confirmed by our team after booking")}
              {detail("Fee", formatNpr(s.fee_npr))}
              {detail("Registration closes", formatDate(s.registration_closes_on))}
              {detail("Results from", formatDate(s.results_date))}
              {detail(
                "Speaking test",
                s.speaking_note ||
                  "A separate slot, usually within about 7 days before or after the test day.",
              )}
            </dl>
          </section>

          <section className="panel panel-pad" aria-labelledby="cand-h">
            <h2 id="cand-h" className="mb-1 text-lg font-bold">
              Candidate
            </h2>
            <dl className="divide-mist divide-y">
              {detail("Taking the test", b.examinee === "self" ? "Myself" : "Someone else")}
              {detail("Full name", b.candidate_name)}
              {detail("Mobile", b.candidate_phone)}
              {detail("Email", b.candidate_email)}
              {detail("Date of birth", b.date_of_birth ? formatDate(b.date_of_birth) : "")}
              {detail(
                "Address",
                [b.municipality, b.district, b.province].filter(Boolean).join(", "),
              )}
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          {live && (
            <section className="panel panel-pad !p-5 print:hidden" aria-labelledby="docs-h">
              <h2 id="docs-h" className="text-lg font-bold">
                Passport
              </h2>
              <p className="text-muted mt-1 mb-3 text-[0.875rem]">
                Front: {b.has_passport ? "uploaded" : "missing"} · Back:{" "}
                {b.has_passport_back ? "uploaded" : "missing"}. Stored privately.
              </p>
              <div className="space-y-3">
                <FileDrop id="doc-front" label="Passport front" file={front} onChange={setFront} />
                <FileDrop id="doc-back" label="Passport back" file={back} onChange={setBack} />
              </div>
              <button
                type="button"
                className="btn btn-dark btn-sm mt-3"
                disabled={busy || (!front && !back)}
                onClick={() => {
                  const form = new FormData();
                  if (front) form.set("passport_front", front);
                  if (back) form.set("passport_back", back);
                  void run(
                    () => bookingApi.documents(b.id, form),
                    "Passport uploaded.",
                    (r) => {
                      setOverride(r);
                      setFront(null);
                      setBack(null);
                    },
                  );
                }}
              >
                Upload
              </button>
            </section>
          )}

          {live && (
            <section className="panel panel-pad !p-5 print:hidden" aria-labelledby="chg-h">
              <h2 id="chg-h" className="text-lg font-bold">
                Need a change?
              </h2>
              {b.change_requested_at && (
                <div className="mt-2 rounded-lg bg-[#f7f8fa] p-3 text-[0.875rem]">
                  <p className="font-semibold">
                    {b.change_open ? "Waiting for our team" : "Resolved by our team"}
                  </p>
                  <p className="text-muted mt-0.5">“{b.change_request}”</p>
                </div>
              )}
              <label htmlFor="chg" className="field-label mt-3">
                Tell us what to change
              </label>
              <textarea
                id="chg"
                rows={3}
                maxLength={1000}
                className="field-input py-2.5"
                placeholder="For example: move me to the next week, or correct the spelling of my name."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm mt-3"
                disabled={busy || msg.trim().length < 5}
                onClick={() =>
                  void run(
                    () => bookingApi.requestChange(b.id, msg.trim()),
                    "Request sent. Our team will reply.",
                    (r) => {
                      setOverride(r);
                      setMsg("");
                    },
                  )
                }
              >
                Send request
              </button>
            </section>
          )}

          {live && <Checklist id={b.id} />}

          <section className="panel panel-pad !p-5 text-[0.9375rem] print:hidden">
            <h2 className="text-lg font-bold">Questions?</h2>
            <p className="text-muted mt-1">Quote {b.reference} when you contact us.</p>
            <a
              href={siteHref("/contact")}
              className="text-crimson mt-2 inline-block font-semibold underline underline-offset-4"
            >
              Contact us
            </a>
          </section>
        </aside>
      </div>
    </>
  );
}
