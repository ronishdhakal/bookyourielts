import Link from "next/link";
import { FORMAT_SHORT, SLOT_TIMES, formatDate, formatNpr } from "@/lib/format";
import { appHref } from "@/lib/portal";
import type { TestSession } from "@/lib/types";
import { SeatChip } from "./seat-chip";

function inquireHref(s: TestSession) {
  const p = new URLSearchParams({
    city: s.city.slug,
    test_type: s.test_type.code,
    test_format: s.format,
  });
  return `/inquire?${p.toString()}`;
}

/** Calendar-leaf style badge: month on top, day number, weekday underneath. */
function DateBadge({ date }: { date: string }) {
  const month = formatDate(date, { day: undefined, year: undefined }).toUpperCase();
  const day = formatDate(date, { month: undefined, year: undefined });
  const weekday = formatDate(date, {
    weekday: "short",
    day: undefined,
    month: undefined,
    year: undefined,
  });
  return (
    <div
      className="border-mist w-[3.75rem] shrink-0 overflow-hidden rounded-md border bg-white text-center leading-none"
      aria-hidden
    >
      <div className="bg-crimson py-1 text-[0.6875rem] font-semibold tracking-wide text-white">
        {month}
      </div>
      <div className="pt-1.5 text-[1.5rem] font-bold tabular-nums">{day}</div>
      <div className="text-muted pt-0.5 pb-1.5 text-[0.6875rem]">{weekday}</div>
    </div>
  );
}

function Action({ s }: { s: TestSession }) {
  if (s.is_bookable) {
    return (
      <Link
        href={appHref(`/book?session=${s.id}`)}
        className="btn btn-primary btn-sm whitespace-nowrap max-md:w-full"
        aria-label={`Book this date: ${s.test_type.name}, ${s.city.name}, ${formatDate(s.date)}`}
      >
        Book this date
      </Link>
    );
  }
  return (
    <Link href={inquireHref(s)} className="btn btn-outline btn-sm whitespace-nowrap max-md:w-full">
      Ask about similar dates
    </Link>
  );
}

/**
 * Open test dates as a clean list. `compact` hides the deadline line (used for short previews).
 * Each row is a self-contained region so it reads well on phones without a separate layout.
 */
export function SessionList({
  sessions,
  compact = false,
  caption,
}: {
  sessions: TestSession[];
  compact?: boolean;
  caption: string;
}) {
  return (
    <ul className="panel divide-mist divide-y overflow-hidden" aria-label={caption}>
      {sessions.map((s) => (
        <li
          key={s.id}
          className="hover:bg-ink/[0.02] grid gap-x-5 gap-y-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center md:px-5"
        >
          <div className="flex min-w-0 items-start gap-4 md:contents">
            <DateBadge date={s.date} />
            <div className="min-w-0 md:col-start-2">
              <p className="text-[1.0625rem] leading-snug font-semibold">{s.test_type.name}</p>
              <p className="text-muted text-[0.9375rem]">
                {s.city.name} · {s.provider_label} · {FORMAT_SHORT[s.format]}
              </p>
              {!compact && (
                <p className="text-muted mt-1 text-[0.8125rem]">
                  {s.slot === "morning" ? "Morning" : "Afternoon"} {SLOT_TIMES[s.slot]} · Register
                  by {formatDate(s.registration_closes_on, { year: undefined })} · Results from{" "}
                  {formatDate(s.results_date, { year: undefined })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-center md:gap-1.5">
            <p className="font-semibold tabular-nums">{formatNpr(s.fee_npr)}</p>
            <SeatChip
              status={s.seat_status}
              label={s.seat_status === "few_left" ? `${s.seats_left} seats left` : undefined}
            />
          </div>
          <Action s={s} />
        </li>
      ))}
    </ul>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel divide-mist divide-y" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="skeleton-light h-16 w-[3.75rem] rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-light h-4 w-1/2 rounded" />
            <div className="skeleton-light h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
