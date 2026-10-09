"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bookingApi, catalogApi } from "@/lib/api";
import { formatDate, formatNpr } from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import type { Booking } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { StatusChip } from "./booking-bits";
import { ProfileCard } from "./profile-card";
import { ProviderDialog } from "./provider-dialog";

export function PortalHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [dialog, setDialog] = useState(false);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [bring, setBring] = useState<string[]>([]);

  // Staff land on the admin dashboard, like students land here. ?student=1 shows this page anyway.
  const staffRedirect =
    !!user?.is_staff &&
    typeof window !== "undefined" &&
    !window.location.search.includes("student");
  useEffect(() => {
    if (staffRedirect) router.replace(portalHref("/manage"));
  }, [staffRedirect, router]);

  useEffect(() => {
    let off = false;
    bookingApi.mine().then(
      (b) => !off && setBookings(b),
      () => !off && setBookings([]),
    );
    catalogApi.content().then(
      (blocks) => {
        const b = blocks.find((x) => x.key === "what-to-bring");
        if (!off && b)
          setBring(
            b.body
              .split("\n")
              .filter((l) => l.startsWith("- "))
              .map((l) => l.slice(2)),
          );
      },
      () => undefined,
    );
    return () => {
      off = true;
    };
  }, []);

  if (!user || staffRedirect) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    ?.filter((b) => b.status !== "cancelled" && b.session.date >= today)
    .sort((a, b) => a.session.date.localeCompare(b.session.date))[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <ProfileCard user={user} />

      <div className="space-y-6">
        <section className="panel panel-pad" aria-labelledby="welcome">
          <h1 id="welcome" className="text-2xl font-bold">
            Welcome, {user.full_name}
          </h1>
          <p className="text-muted mt-0.5">Hope you are having a good day.</p>

          <div className="on-dark bg-crimson mt-6 flex flex-col gap-5 rounded-lg px-6 py-7 text-white md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <p className="text-2xl font-bold md:text-3xl">Book your IELTS test date</p>
              <p className="mt-1 max-w-xl text-white/85">
                Choose a provider, search dates by your preferences and add your details. It takes
                about three minutes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialog(true)}
              className="btn text-crimson shrink-0 bg-white hover:bg-white/90"
            >
              Book now
            </button>
          </div>

          <h2 className="mt-9 text-lg font-bold">Reserve your date today</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setDialog(true)}
              className="border-mist hover:border-ink group rounded-lg border bg-white p-5 text-left shadow-sm transition-colors"
            >
              <span className="border-mist text-crimson flex h-14 w-14 items-center justify-center rounded-md border text-lg font-extrabold">
                IELTS
              </span>
              <span className="mt-4 block font-semibold">IELTS</span>
              <span className="text-muted block text-[0.8125rem]">
                Academic, General Training, UKVI
              </span>
            </button>
            <a
              href={siteHref("/inquire")}
              className="border-mist hover:border-ink rounded-lg border bg-white p-5 shadow-sm transition-colors"
            >
              <span
                className="border-mist text-muted flex h-14 w-14 items-center justify-center rounded-md border text-2xl"
                aria-hidden
              >
                ?
              </span>
              <span className="mt-4 block font-semibold">Date not listed?</span>
              <span className="text-muted block text-[0.8125rem]">
                Send an inquiry and we will contact you
              </span>
            </a>
          </div>
        </section>

        {upcoming && (
          <section className="panel panel-pad" aria-labelledby="next-test">
            <p className="section-title">Your next test</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 id="next-test" className="text-xl font-bold">
                  {upcoming.session.test_type.name} · {upcoming.session.city.name}
                </h2>
                <p className="text-muted">
                  {formatDate(upcoming.session.date, { weekday: "long" })} ·{" "}
                  {formatNpr(upcoming.session.fee_npr)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={upcoming.status} />
                <Link
                  href={portalHref(`/bookings/${upcoming.id}`)}
                  className="btn btn-outline btn-sm"
                >
                  View
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="panel panel-pad" aria-labelledby="recent">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="recent" className="text-lg font-bold">
              Recent bookings
            </h2>
            <Link
              href={portalHref("/bookings")}
              className="text-crimson font-semibold underline underline-offset-4"
            >
              See all
            </Link>
          </div>
          {!bookings ? (
            <div className="skeleton-light h-20 rounded-lg" role="status" aria-label="Loading" />
          ) : bookings.length === 0 ? (
            <p className="text-muted">
              You have not made a booking request yet. Your requests will appear here.
            </p>
          ) : (
            <ul className="divide-mist divide-y">
              {bookings.slice(0, 3).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">
                      {b.session.test_type.name} · {b.session.city.name}
                    </p>
                    <p className="text-muted text-[0.8125rem]">
                      {b.reference} · {formatDate(b.session.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip status={b.status} />
                    <Link
                      href={portalHref(`/bookings/${b.id}`)}
                      className="text-crimson font-semibold underline underline-offset-4"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {bring.length > 0 && (
          <section className="panel panel-pad" aria-labelledby="bring">
            <h2 id="bring" className="text-lg font-bold">
              Before test day
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              {bring.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="text-muted mt-3 text-[0.875rem]">
              Phones, bags, watches and notes are kept outside the test room.
            </p>
          </section>
        )}
      </div>

      <ProviderDialog open={dialog} onClose={() => setDialog(false)} />
    </div>
  );
}
