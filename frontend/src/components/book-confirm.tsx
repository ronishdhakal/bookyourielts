"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, authApi, bookingApi } from "@/lib/api";
import { SLOT_TIMES, formatDate, formatLong, formatNpr } from "@/lib/format";
import type { Booking, TestSession } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { FormError } from "./text-field";

export function BookConfirm({ session, disclaimer }: { session: TestSession; disclaimer: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!loading && !user)
      router.replace(`/login?next=${encodeURIComponent(`/book/${session.id}`)}`);
  }, [loading, user, router, session.id]);

  async function onBook() {
    setError(null);
    setBusy(true);
    // Open the tab inside the click so mobile browsers do not block it, then point it at WhatsApp.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const b = await bookingApi.create(session.id);
      setBooking(b);
      if (tab) tab.location.href = b.whatsapp_url;
      else setBlocked(true);
    } catch (e) {
      tab?.close();
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  if (loading || !user) {
    return (
      <div
        className="skeleton-light h-72 rounded-md"
        role="status"
        aria-label="Loading your booking"
      >
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Test", session.test_type.name],
    ["Format", session.format_label],
    ["Date", `${formatLong(session.date)}, ${session.date.slice(0, 4)}`],
    [
      "Session",
      `${session.slot === "morning" ? "Morning" : "Afternoon"}, ${SLOT_TIMES[session.slot]}`,
    ],
    ["City", session.city.name],
    ...(session.venue
      ? ([
          [
            "Venue",
            session.venue.name + (session.venue.address ? `, ${session.venue.address}` : ""),
          ],
        ] as [string, string][])
      : []),
    ["Fee", formatNpr(session.fee_npr)],
    ["Registration closes", formatDate(session.registration_closes_on)],
    ["Results expected", `from ${formatDate(session.results_date)}`],
  ];

  if (booking) {
    return (
      <div className="space-y-6" role="status">
        <div className="border-ok bg-white-ish rounded-md border-2 p-6">
          <p className="eyebrow">Booking request {booking.reference}</p>
          <h2 className="mt-1 text-3xl font-extrabold">
            Almost done. Send the message on WhatsApp.
          </h2>
          <p className="text-muted mt-3 max-w-xl">
            {blocked
              ? "Your browser stopped WhatsApp from opening. Tap the button below to open it."
              : "WhatsApp should have opened in a new tab with your details filled in. Press send there and our team will reply."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={booking.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              {blocked ? "Open WhatsApp" : "Continue on WhatsApp"}
            </a>
            <Link href="/dashboard" className="btn btn-outline">
              Go to my bookings
            </Link>
          </div>
        </div>
        <p className="text-muted text-sm">
          Your seat is not confirmed until our team confirms it on WhatsApp. If you did not see
          WhatsApp open, you can always resend from{" "}
          <button
            type="button"
            className="text-crimson underline"
            onClick={() => bookingApi.resend(booking.id).then(() => setResent(true))}
          >
            this link
          </button>
          {resent && " (done)"}.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="summary">
        <h2 id="summary" className="eyebrow !text-ink mb-3 font-medium">
          Your test
        </h2>
        <dl className="border-ink divide-mist divide-y border-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr]">
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted mt-4 text-[0.9375rem]">
          {session.speaking_note ||
            "Listening, Reading and Writing are on this date. Your Speaking test is a separate slot, usually within about 7 days before or after."}
        </p>
      </section>

      <section aria-labelledby="you" className="space-y-5">
        <div>
          <h2 id="you" className="eyebrow !text-ink mb-3 font-medium">
            Booking for
          </h2>
          <p className="text-lg font-semibold">{user.full_name}</p>
          <p className="text-muted">
            {user.phone || "No phone number saved"} · {user.email}
          </p>
        </div>

        {!user.email_verified && (
          <div className="border-marigold bg-white-ish rounded-md border-l-4 px-4 py-3 text-[0.9375rem]">
            Please verify your email too. We sent a link when you signed up.{" "}
            <button
              type="button"
              className="text-crimson font-semibold underline"
              onClick={() => authApi.resendVerification().catch(() => undefined)}
            >
              Send it again
            </button>
            . You can still book now.
          </div>
        )}

        <FormError message={error} />

        {session.is_bookable ? (
          <button
            type="button"
            onClick={onBook}
            disabled={busy}
            className="btn btn-primary w-full text-lg"
          >
            {busy ? "Opening WhatsApp…" : "Book via WhatsApp"}
          </button>
        ) : (
          <div className="space-y-3">
            <p role="alert" className="text-crimson font-semibold">
              {session.seat_status === "full"
                ? "This date is full."
                : "Registration for this date has closed."}
            </p>
            <Link href="/ielts-test-dates" className="btn btn-primary w-full">
              Choose another date
            </Link>
          </div>
        )}

        <ul className="text-muted list-disc space-y-1 pl-5 text-[0.9375rem]">
          <li>
            This opens WhatsApp with a message ready to send. Nothing is paid on this website.
          </li>
          <li>Your seat is reserved only after our team confirms it in the chat.</li>
        </ul>
        <p className="text-muted border-mist border-t pt-4 text-[0.8125rem]">{disclaimer}</p>
      </section>
    </div>
  );
}
