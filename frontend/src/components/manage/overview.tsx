"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { Stats } from "@/lib/types";
import { SeatChip } from "../seat-chip";
import { useStats } from "./manage-shell";
import { ErrorNote, PageTitle, Pill, SkeletonRows, relativeTime } from "./ui";

function Kpi({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  tone?: "alert";
}) {
  return (
    <Link
      href={portalHref(href)}
      className="hover:bg-ink/[0.03] group block px-5 py-4 transition-colors"
    >
      <p className="text-muted text-[0.8125rem] font-medium">{label}</p>
      <p
        className={`mt-1 font-mono text-4xl leading-none font-semibold ${tone === "alert" && value > 0 ? "text-crimson" : ""}`}
      >
        {value}
      </p>
      <p className="text-muted mt-2 text-[0.8125rem] group-hover:underline">{hint}</p>
    </Link>
  );
}

function Bars({ data }: { data: Stats["per_day"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Requests, last 14 days</h2>
        <p className="font-mono text-sm whitespace-nowrap">{total} total</p>
      </div>
      <div className="mt-4 flex h-36 items-end gap-1.5" aria-hidden>
        {data.map((d) => (
          <div key={d.date} className="group flex h-full flex-1 flex-col justify-end">
            <span className="text-muted mb-1 text-center font-mono text-[0.6875rem] opacity-0 group-hover:opacity-100">
              {d.count}
            </span>
            <div
              className={`rounded-t-sm ${d.count ? "bg-spruce" : "bg-mist"}`}
              style={{ height: `${d.count ? Math.max(6, (d.count / max) * 100) : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div
        className="text-muted mt-1.5 flex justify-between font-mono text-[0.6875rem]"
        aria-hidden
      >
        <span>{formatDate(data[0]?.date ?? "", { year: undefined })}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>Booking requests per day</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Overview() {
  const { stats, error, reload } = useStats();
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!stats)
    return (
      <>
        <PageTitle title="Overview" />
        <SkeletonRows rows={5} />
      </>
    );
  const seats = stats.seats_next_30_days;
  const pct = seats.total ? Math.round((seats.booked / seats.total) * 100) : 0;

  return (
    <>
      <PageTitle
        title="Overview"
        lede="What needs your attention today, and how bookings are going."
        actions={
          <Link href={portalHref("/manage/dates/new")} className="btn btn-primary btn-sm">
            Add a test date
          </Link>
        }
      />

      <section
        aria-label="Key numbers"
        className="panel divide-mist grid divide-y sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0"
      >
        <Kpi
          label="Awaiting confirmation"
          value={stats.bookings.initiated}
          hint="Review requests"
          href="/manage/bookings?status=initiated"
          tone="alert"
        />
        <Kpi
          label="New inquiries"
          value={stats.new_inquiries}
          hint="Reply to students"
          href="/manage/inquiries?status=new"
          tone="alert"
        />
        <Kpi
          label="Confirmed bookings"
          value={stats.bookings.confirmed}
          hint={`${stats.bookings.total} requests in total`}
          href="/manage/bookings?status=confirmed"
        />
        <Kpi
          label="Open test dates"
          value={stats.open_dates}
          hint={`${stats.hidden_dates} hidden`}
          href="/manage/dates"
        />
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="panel panel-pad">
          <Bars data={stats.per_day} />
        </section>
        <section className="panel panel-pad">
          <h2 className="text-lg font-bold">Seats, next 30 days</h2>
          <p className="mt-3 font-mono text-4xl font-semibold">
            {seats.booked}
            <span className="text-muted text-xl"> / {seats.total}</span>
          </p>
          <div
            className="bg-mist mt-3 h-2 overflow-hidden rounded-full"
            role="img"
            aria-label={`${pct}% of seats confirmed`}
          >
            <div className="bg-spruce h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-muted mt-2 text-[0.875rem]">
            {pct}% confirmed · {stats.students} students registered
          </p>

          <h3 className="mt-6 text-[0.9375rem] font-bold">Running low</h3>
          {stats.low_seat_dates.length === 0 ? (
            <p className="text-muted mt-2 text-[0.875rem]">No open date is close to full.</p>
          ) : (
            <ul className="divide-mist mt-1 divide-y">
              {stats.low_seat_dates.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={portalHref(`/manage/dates/${s.id}`)}
                    className="min-w-0 hover:underline"
                  >
                    <span className="block truncate text-[0.9375rem] font-semibold">
                      {formatDate(s.date, { year: undefined })} · {s.city.name}
                    </span>
                    <span className="text-muted block truncate text-[0.8125rem]">
                      {s.test_type.name}
                    </span>
                  </Link>
                  <SeatChip tone="light" status={s.seat_status} label={`${s.seats_left} left`} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel mt-6" aria-labelledby="recent">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 id="recent" className="text-lg font-bold">
            Latest requests
          </h2>
          <Link
            href={portalHref("/manage/bookings")}
            className="text-crimson font-semibold underline underline-offset-4"
          >
            See all
          </Link>
        </div>
        {stats.recent_bookings.length === 0 ? (
          <p className="text-muted px-5 py-8 text-center">No booking requests yet.</p>
        ) : (
          <ul className="divide-mist mt-2 divide-y">
            {stats.recent_bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={portalHref(`/manage/bookings/${b.id}`)}
                  className="hover:bg-ink/[0.03] grid items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[9rem_1fr_auto_6rem]"
                >
                  <span className="font-mono text-[0.8125rem]">{b.reference}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{b.student}</span>
                    <span className="text-muted block truncate text-[0.8125rem]">
                      {b.test} · {b.city} · {formatDate(b.date, { year: undefined })}
                    </span>
                  </span>
                  <Pill kind="booking" status={b.status} />
                  <span className="text-muted text-[0.8125rem] sm:text-right">
                    {relativeTime(b.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
