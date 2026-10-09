"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, authApi, bookingApi, inquiryApi } from "@/lib/api";
import { SLOT_TIMES, formatDate, formatNpr } from "@/lib/format";
import type { Booking, Inquiry } from "@/lib/types";
import { useAuth } from "./auth-provider";

const STATUS_STYLE: Record<string, string> = {
  initiated: "bg-marigold text-ink",
  confirmed: "bg-ok text-white",
  cancelled: "bg-mist text-ink",
};
const STATUS_HELP: Record<string, string> = {
  initiated: "Waiting for you to send the WhatsApp message, or for our reply.",
  confirmed: "Your seat is confirmed.",
  cancelled: "This request was cancelled.",
};

export function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    return Promise.all([bookingApi.mine(), inquiryApi.mine()]).then(
      ([b, i]) => {
        setError(null);
        setBookings(b);
        setInquiries(i);
      },
      (e) => setError(e instanceof ApiError ? e.message : "Could not load your bookings."),
    );
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/dashboard");
    else void load();
  }, [loading, user, router, load]);

  if (loading || !user || (!bookings && !error)) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading your bookings">
        <div className="skeleton-light h-28 rounded-md" />
        <div className="skeleton-light h-28 rounded-md" />
      </div>
    );
  }

  async function resend(b: Booking) {
    try {
      const fresh = await bookingApi.resend(b.id);
      window.open(fresh.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open WhatsApp.");
    }
  }

  return (
    <div className="space-y-14">
      {!user.email_verified && (
        <div className="border-marigold bg-white-ish rounded-md border-l-4 px-4 py-3">
          Your email is not verified yet. Check your inbox for our link.{" "}
          <button
            type="button"
            className="text-crimson font-semibold underline"
            onClick={() =>
              authApi.resendVerification().then(
                () => setNote("Verification email sent."),
                () => setNote("Could not send the email right now."),
              )
            }
          >
            Send it again
          </button>
          {note && <span className="text-muted"> · {note}</span>}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="border-crimson text-crimson rounded-md border-2 px-4 py-3 font-medium"
        >
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <section aria-labelledby="bk">
        <h2 id="bk" className="text-3xl font-extrabold">
          Booking requests
        </h2>
        {bookings && bookings.length === 0 ? (
          <div className="border-mist mt-5 rounded-md border-2 border-dashed px-6 py-10 text-center">
            <p className="text-xl font-semibold">You have not requested a date yet.</p>
            <p className="text-muted mt-1">Pick an IELTS date and we will open WhatsApp for you.</p>
            <Link href="/ielts-test-dates" className="btn btn-primary mt-5">
              See IELTS test dates
            </Link>
          </div>
        ) : (
          <ul className="border-ink divide-mist mt-5 divide-y border-y-2">
            {bookings?.map((b) => (
              <li key={b.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm">{b.reference}</span>
                    <span
                      className={`rounded-sm px-2 py-1 font-mono text-xs font-semibold ${STATUS_STYLE[b.status]}`}
                    >
                      {b.status_label}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold">
                    {b.session.test_type.name} · {b.session.city.name}
                  </p>
                  <p className="text-muted">
                    {formatDate(b.session.date, { weekday: "long" })} · {SLOT_TIMES[b.session.slot]}{" "}
                    · {b.session.format_label} · {formatNpr(b.session.fee_npr)}
                  </p>
                  <p className="text-muted mt-1 text-sm">{STATUS_HELP[b.status]}</p>
                </div>
                {b.status !== "cancelled" && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void resend(b)}
                  >
                    Continue on WhatsApp
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="inq">
        <h2 id="inq" className="text-3xl font-extrabold">
          Your inquiries
        </h2>
        {inquiries && inquiries.length === 0 ? (
          <p className="text-muted mt-3">
            No inquiries yet. If you cannot find a date,{" "}
            <Link href="/inquire" className="text-crimson underline">
              send us an inquiry
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-mist border-ink mt-5 divide-y border-y-2">
            {inquiries?.map((i) => (
              <li key={i.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold">
                    {[i.test_type, i.preferred_city, i.preferred_month]
                      .filter(Boolean)
                      .join(" · ") || "Any date"}
                  </p>
                  <p className="text-muted text-sm">
                    Sent {formatDate(i.created_at.slice(0, 10))} · Status: {i.status}
                  </p>
                </div>
                <a
                  href={i.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Continue on WhatsApp
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
