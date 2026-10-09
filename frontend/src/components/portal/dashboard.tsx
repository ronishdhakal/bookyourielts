"use client";

import { ProviderLogo } from "../provider-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatDate, formatNpr } from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import { useAuth } from "../auth-provider";
import { Countdown, StatusChip, Tracker, daysUntil } from "./booking-bits";
import { bookingTasks, usePortalData, type Task } from "./portal-data";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const { user } = useAuth();
  const { bookings, alerts, error, reload } = usePortalData();
  const router = useRouter();

  // Staff land on the admin dashboard, like students land here. ?student=1 shows this page anyway.
  const staffRedirect =
    !!user?.is_staff &&
    typeof window !== "undefined" &&
    !window.location.search.includes("student");
  useEffect(() => {
    if (staffRedirect) router.replace(portalHref("/manage"));
  }, [staffRedirect, router]);

  if (!user || staffRedirect) return null;
  const first = user.full_name.split(" ")[0];
  const upcoming = (bookings ?? [])
    .filter((b) => b.status !== "cancelled" && daysUntil(b.session.date) >= 0)
    .sort((a, b) => a.session.date.localeCompare(b.session.date))[0];

  const tasks: Task[] = [
    ...(bookings ?? []).flatMap((b) => bookingTasks(b, (id) => portalHref(`/bookings/${id}`))),
    ...(!user.email_verified
      ? [
          {
            key: "verify",
            text: "Verify your email address",
            href: portalHref("/profile"),
            action: "Verify",
          },
        ]
      : []),
    ...(!user.date_of_birth
      ? [
          {
            key: "dob",
            text: "Add your date of birth",
            href: portalHref("/profile"),
            action: "Add",
          },
        ]
      : []),
  ];
  const liveAlerts = (alerts ?? []).filter((a) => a.is_active);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {greeting()}, {first}
          </h1>
          <p className="text-muted mt-1">Here is where your IELTS bookings stand.</p>
        </div>
        <Link href={portalHref("/dates")} className="btn btn-primary">
          Find a date
        </Link>
      </div>

      {error && (
        <div role="alert" className="border-crimson mb-6 rounded-lg border-2 px-4 py-3 font-medium">
          {error}{" "}
          <button type="button" className="text-crimson underline" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <section className="panel panel-pad" aria-labelledby="next-test">
            {!bookings ? (
              <div className="skeleton-light h-48 rounded-lg" role="status" aria-label="Loading" />
            ) : upcoming ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="section-title">Your next test</p>
                    <h2 id="next-test" className="mt-2 flex items-center gap-3 text-2xl font-bold">
                      <ProviderLogo
                        provider={upcoming.session.provider}
                        label={upcoming.session.provider_label}
                        height={36}
                      />
                      <span>{upcoming.session.test_type.name}</span>
                    </h2>
                    <p className="text-muted">
                      {upcoming.session.city.name} · {upcoming.session.format_label}
                    </p>
                    <p className="mt-2 font-semibold">
                      {formatDate(upcoming.session.date, { weekday: "long" })} ·{" "}
                      {formatNpr(upcoming.session.fee_npr)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-crimson">
                      <Countdown iso={upcoming.session.date} />
                    </p>
                    <div className="mt-2">
                      <StatusChip status={upcoming.status} />
                    </div>
                  </div>
                </div>
                <div className="border-mist mt-6 border-t pt-6">
                  <Tracker booking={upcoming} />
                </div>
                <div className="mt-6">
                  <Link
                    href={portalHref(`/bookings/${upcoming.id}`)}
                    className="btn btn-outline btn-sm"
                  >
                    Open booking {upcoming.reference}
                  </Link>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <h2 id="next-test" className="text-xl font-bold">
                  No test booked yet
                </h2>
                <p className="text-muted mx-auto mt-1 max-w-md">
                  Browse open dates by provider, test type, format and city, and book one in a
                  panel.
                </p>
                <Link href={portalHref("/dates")} className="btn btn-primary mt-5">
                  Find a date
                </Link>
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="recent">
            <div className="flex items-center justify-between px-5 pt-5 md:px-8 md:pt-6">
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
              <div className="skeleton-light m-5 h-20 rounded-lg" />
            ) : bookings.length === 0 ? (
              <p className="text-muted px-5 py-8 text-center md:px-8">
                Your bookings will appear here.
              </p>
            ) : (
              <ul className="divide-mist mt-2 divide-y">
                {bookings.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <Link
                      href={portalHref(`/bookings/${b.id}`)}
                      className="grid items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-[#fafbfc] sm:grid-cols-[1fr_auto_auto] md:px-8"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {b.session.test_type.name} · {b.session.city.name}
                        </span>
                        <span className="text-muted block text-[0.8125rem]">
                          {b.candidate_name || user.full_name} · {formatDate(b.session.date)} ·{" "}
                          {b.reference}
                        </span>
                      </span>
                      <StatusChip status={b.status} />
                      <span className="text-muted hidden text-sm sm:block" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="h-3" />
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel panel-pad !p-5" aria-labelledby="todo">
            <h2 id="todo" className="text-lg font-bold">
              To do
            </h2>
            {!bookings ? (
              <div className="skeleton-light mt-3 h-16 rounded-lg" />
            ) : tasks.length === 0 ? (
              <p className="text-muted mt-2">You are all caught up.</p>
            ) : (
              <ul className="divide-mist mt-2 divide-y">
                {tasks.map((t) => (
                  <li key={t.key} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-[0.9375rem]">{t.text}</span>
                    <Link href={t.href} className="btn btn-outline btn-sm shrink-0">
                      {t.action}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel panel-pad !p-5" aria-labelledby="alerts-h">
            <div className="flex items-center justify-between">
              <h2 id="alerts-h" className="text-lg font-bold">
                Date alerts
              </h2>
              <Link
                href={portalHref("/alerts")}
                className="text-crimson text-[0.9375rem] font-semibold underline underline-offset-4"
              >
                Manage
              </Link>
            </div>
            {!alerts ? (
              <div className="skeleton-light mt-3 h-16 rounded-lg" />
            ) : liveAlerts.length === 0 ? (
              <p className="text-muted mt-2 text-[0.9375rem]">
                Not finding the date you need? Search on{" "}
                <Link href={portalHref("/dates")} className="text-crimson underline">
                  Find a date
                </Link>{" "}
                and save the search. We show new matches here.
              </p>
            ) : (
              <ul className="divide-mist mt-2 divide-y">
                {liveAlerts.slice(0, 4).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-3 text-[0.9375rem]"
                  >
                    <span>
                      {a.matches} open {a.matches === 1 ? "date" : "dates"}
                      {a.next_date && (
                        <span className="text-muted">
                          {" "}
                          · next {formatDate(a.next_date, { year: undefined })}
                        </span>
                      )}
                    </span>
                    {a.new_matches > 0 && (
                      <span className="bg-crimson rounded-full px-2 py-0.5 text-xs font-semibold text-white">
                        {a.new_matches} new
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel panel-pad !p-5" aria-labelledby="help-h">
            <h2 id="help-h" className="text-lg font-bold">
              Questions?
            </h2>
            <p className="text-muted mt-1 text-[0.9375rem]">
              Ask our team, or request a date that is not listed.
            </p>
            <Link href={portalHref("/help")} className="btn btn-outline btn-sm mt-3">
              Ask us
            </Link>
          </section>

          <section className="panel panel-pad !p-5">
            <h2 className="text-lg font-bold">Before test day</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem]">
              <li>Your original passport, the one you registered with</li>
              <li>Your booking confirmation</li>
              <li>A water bottle without a label</li>
            </ul>
            <p className="text-muted mt-2 text-[0.8125rem]">
              Phones, bags and notes stay outside the test room.{" "}
              <a href={siteHref("/ielts-on-computer-nepal")} className="text-crimson underline">
                Test day guide
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
