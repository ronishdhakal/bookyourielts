"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, bookingApi } from "@/lib/api";
import { SLOT_TIMES, formatDate, formatLong, formatNpr } from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import type { Booking } from "@/lib/types";
import { FormError } from "../text-field";
import { ProviderMark, STATUS_UI, StatusChip } from "./booking-bits";

function useBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      bookingApi.mine().then(
        (b) => {
          setError(null);
          setBookings(b);
        },
        (e) => setError(e instanceof ApiError ? e.message : "Could not load your bookings."),
      ),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return { bookings, error, reload: load };
}

export function BookingsList() {
  const { bookings, error, reload } = useBookings();
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("all");

  if (error)
    return (
      <div role="alert" className="panel panel-pad border-crimson !border-2">
        <FormError message={error} />
        <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => void reload()}>
          Try again
        </button>
      </div>
    );
  if (!bookings)
    return (
      <div className="space-y-4" role="status" aria-label="Loading your bookings">
        <div className="skeleton-light h-40 rounded-xl" />
        <div className="skeleton-light h-40 rounded-xl" />
      </div>
    );

  const shown = bookings.filter((b) =>
    filter === "all"
      ? true
      : filter === "cancelled"
        ? b.status === "cancelled"
        : b.status !== "cancelled",
  );

  return (
    <div>
      <div
        className="mb-5 flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Filter bookings"
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
            className={`min-h-10 rounded-full border px-4 text-[0.9375rem] font-semibold ${filter === v ? "bg-ink text-paper border-ink" : "border-mist hover:border-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="border-mist rounded-xl border-2 border-dashed px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold">
            {bookings.length === 0 ? "No bookings yet" : "Nothing in this view"}
          </p>
          <p className="text-muted mt-1">Reserve your IELTS date in a few steps.</p>
          <Link href={portalHref("/book")} className="btn btn-primary mt-5">
            Book an exam
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {shown.map((b) => (
            <li key={b.id}>
              <article className="panel overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <ProviderMark label={b.session.provider_label} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-bold">
                      {b.session.provider_label}{" "}
                      {b.session.test_type.name.replace("IELTS ", "IELTS ")}
                    </h2>
                    <p className="text-muted text-[0.9375rem]">
                      {b.session.city.name} · {b.session.format_label}
                    </p>
                  </div>
                  <StatusChip status={b.status} />
                </div>
                <dl className="border-mist grid gap-4 border-t border-dashed px-5 py-4 text-[0.9375rem] sm:grid-cols-4">
                  <Fact k="Test day" v={formatDate(b.session.date, { weekday: "short" })} />
                  <Fact k="Candidate" v={b.candidate_name || "Not added"} />
                  <Fact k="Fee" v={formatNpr(b.session.fee_npr)} mono />
                  <Fact k="Reference" v={b.reference} mono />
                </dl>
                <div className="bg-paper/60 border-mist flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                  <p className="text-muted text-[0.875rem]">{STATUS_UI[b.status].help}</p>
                  <Link href={portalHref(`/bookings/${b.id}`)} className="btn btn-outline btn-sm">
                    View details
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Fact({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted text-[0.8125rem]">{k}</dt>
      <dd className={`font-semibold break-words ${mono ? "font-mono text-[0.9375rem]" : ""}`}>
        {v}
      </dd>
    </div>
  );
}

export function BookingDetail({ id }: { id: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let off = false;
    bookingApi.get(id).then(
      (b) => !off && setBooking(b),
      (e) => {
        if (off) return;
        if (e instanceof ApiError && e.status === 404) setMissing(true);
        else setError(e instanceof ApiError ? e.message : "Could not load this booking.");
      },
    );
    return () => {
      off = true;
    };
  }, [id]);

  if (missing)
    return (
      <div className="panel panel-pad text-center">
        <p className="font-display text-2xl font-bold">We could not find that booking</p>
        <Link href={portalHref("/bookings")} className="btn btn-outline mt-4">
          Back to my bookings
        </Link>
      </div>
    );
  if (error) return <FormError message={error} />;
  if (!booking)
    return (
      <div className="skeleton-light h-96 rounded-xl" role="status" aria-label="Loading booking" />
    );

  const s = booking.session;

  async function resend() {
    if (!booking) return;
    try {
      const fresh = await bookingApi.resend(booking.id);
      window.open(fresh.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open WhatsApp.");
    }
  }

  async function withdraw() {
    if (!booking) return;
    setBusy(true);
    try {
      setBooking(await bookingApi.cancel(booking.id));
      setAskCancel(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not withdraw this request.");
    }
    setBusy(false);
  }

  const steps = [
    { label: "Request sent", date: formatDate(booking.created_at.slice(0, 10)), done: true },
    {
      label: "Confirmed by our team",
      date:
        booking.status === "confirmed"
          ? "Done"
          : booking.status === "cancelled"
            ? "Cancelled"
            : "Waiting",
      done: booking.status === "confirmed",
    },
    { label: "Registration closes", date: formatDate(s.registration_closes_on), done: false },
    { label: "Test day", date: formatDate(s.date), done: false },
    { label: "Results from", date: formatDate(s.results_date), done: false },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <div className="panel panel-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm">{booking.reference}</p>
              <h2 className="font-display mt-1 text-3xl font-bold">
                {s.provider_label} {s.test_type.name}
              </h2>
              <p className="text-muted">
                {s.city.name} · {s.format_label}
              </p>
            </div>
            <StatusChip status={booking.status} />
          </div>
          <p className="text-muted mt-4">{STATUS_UI[booking.status].help}</p>
          {error && (
            <div className="mt-4">
              <FormError message={error} />
            </div>
          )}
          {booking.status !== "cancelled" && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={() => void resend()}>
                Continue on WhatsApp
              </button>
              {booking.status === "initiated" && !askCancel && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAskCancel(true)}
                >
                  Withdraw request
                </button>
              )}
            </div>
          )}
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
                  onClick={() => void withdraw()}
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
        </div>

        <div className="panel panel-pad">
          <h3 className="section-title mb-3">EXAM</h3>
          <dl className="divide-mist divide-y">
            {(
              [
                ["Test day", `${formatLong(s.date)}, ${s.date.slice(0, 4)}`],
                [
                  "Session",
                  `${s.slot === "morning" ? "Morning" : "Afternoon"}, ${SLOT_TIMES[s.slot]}`,
                ],
                [
                  "Venue",
                  s.venue
                    ? `${s.venue.name}${s.venue.address ? `, ${s.venue.address}` : ""}`
                    : s.city.name,
                ],
                ["Fee", formatNpr(s.fee_npr)],
                [
                  "Speaking test",
                  s.speaking_note ||
                    "A separate slot, usually within about 7 days before or after the test day.",
                ],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr]">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="panel panel-pad">
          <h3 className="section-title mb-3">CANDIDATE</h3>
          <dl className="divide-mist divide-y">
            {(
              [
                ["Taking the test", booking.examinee === "self" ? "Myself" : "Someone else"],
                ["Full name", booking.candidate_name],
                ["Mobile", booking.candidate_phone],
                ["Email", booking.candidate_email],
                ["Date of birth", booking.date_of_birth ? formatDate(booking.date_of_birth) : ""],
                [
                  "Address",
                  [booking.municipality, booking.district, booking.province]
                    .filter(Boolean)
                    .join(", "),
                ],
                [
                  "Passport",
                  booking.has_passport ? "Uploaded and stored privately" : "Not uploaded",
                ],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr]">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold break-words">{v || "Not provided"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="panel panel-pad">
          <h3 className="section-title mb-4">TIMELINE</h3>
          <ol>
            {steps.map((t, i) => (
              <li key={t.label} className="relative pb-5 pl-8 last:pb-0">
                {i < steps.length - 1 && (
                  <span aria-hidden className="bg-mist absolute top-5 left-[7px] h-full w-0.5" />
                )}
                <span
                  aria-hidden
                  className={`absolute top-1 left-0 h-4 w-4 rounded-full border-2 ${t.done ? "bg-spruce border-spruce" : "bg-white-ish border-[#8a9a95]"}`}
                />
                <p className="leading-tight font-semibold">{t.label}</p>
                <p className="text-muted font-mono text-[0.8125rem]">{t.date}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel panel-pad text-[0.9375rem]">
          <h3 className="font-display text-lg font-bold">Need to change something?</h3>
          <p className="text-muted mt-1">
            Message our team and quote {booking.reference}. Changes depend on how close the test
            date is.
          </p>
          <a
            href={siteHref("/contact")}
            className="text-crimson mt-2 inline-block font-semibold underline underline-offset-4"
          >
            Contact us
          </a>
        </div>
      </aside>
    </div>
  );
}
