import Link from "next/link";
import { FORMAT_SHORT, SLOT_TIMES, formatDate, formatNpr } from "@/lib/format";
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

function Action({
  s,
  small = false,
  wrap = false,
}: {
  s: TestSession;
  small?: boolean;
  wrap?: boolean;
}) {
  const nowrap = wrap ? "" : "whitespace-nowrap";
  const size = small ? "btn-sm" : "";
  if (s.is_bookable) {
    return (
      <Link
        href={`/book/${s.id}`}
        className={`btn btn-primary ${size} ${nowrap}`}
        aria-label={`Book via WhatsApp: ${s.test_type.name}, ${s.city.name}, ${formatDate(s.date)}`}
      >
        Book via WhatsApp
      </Link>
    );
  }
  return (
    <Link
      href={inquireHref(s)}
      className={`btn ${size} border-board/50 text-board hover:bg-board hover:text-spruce ${nowrap}`}
    >
      Ask about similar dates
    </Link>
  );
}

function DateCell({ s }: { s: TestSession }) {
  return (
    <div className="font-mono whitespace-nowrap">
      <div className="text-[1.375rem] leading-none font-semibold tracking-tight">
        {formatDate(s.date, { year: undefined })}
      </div>
      <div className="text-board/70 mt-1 text-[0.75rem]">
        {s.weekday} · {s.date.slice(0, 4)}
      </div>
    </div>
  );
}

/**
 * The departure board. Table from md up, stacked "pass" rows on phones.
 * `compact` drops the deadline columns (used in the hero and on the home page).
 */
export function SessionBoard({
  sessions,
  compact = false,
  animate = false,
  caption,
}: {
  sessions: TestSession[];
  compact?: boolean;
  animate?: boolean;
  caption: string;
}) {
  const rowClass = () => (animate ? "board-row-in" : "");
  return (
    <div className="on-dark bg-spruce text-board overflow-hidden rounded-md">
      {/* Desktop table */}
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-board/20 text-board/70 border-b font-mono text-[0.75rem] font-medium">
            <th scope="col" className="px-4 py-3 font-medium">
              Date
            </th>
            {compact ? (
              <th scope="col" className="px-2 py-3 font-medium">
                Test, city and fee
              </th>
            ) : (
              <>
                <th scope="col" className="px-2 py-3 font-medium">
                  City
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Test
                </th>
              </>
            )}
            {!compact && (
              <th scope="col" className="px-2 py-3 font-medium">
                Session
              </th>
            )}
            {!compact && (
              <th scope="col" className="px-2 py-3 font-medium">
                Fee
              </th>
            )}
            {!compact && (
              <th scope="col" className="px-2 py-3 font-medium">
                Registration closes · Results
              </th>
            )}
            <th scope="col" className="px-2 py-3 font-medium">
              Seats
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr
              key={s.id}
              style={{ "--i": i } as React.CSSProperties}
              className={`border-board/15 hover:bg-spruce-2 border-b align-top last:border-b-0 ${rowClass()}`}
            >
              <td className="px-4 py-4">
                <DateCell s={s} />
              </td>
              {compact ? (
                <td className="px-2 py-4">
                  <div className="font-semibold">{s.test_type.name.replace("IELTS ", "")}</div>
                  <div className="text-board/70 text-[0.8125rem]">
                    {s.city.name} · {FORMAT_SHORT[s.format]}
                  </div>
                  <div className="mt-1 font-mono text-[0.8125rem]">{formatNpr(s.fee_npr)}</div>
                </td>
              ) : (
                <>
                  <td className="px-2 py-4">
                    <div className="font-semibold">{s.city.name}</div>
                    {s.venue && (
                      <div className="text-board/70 max-w-[11rem] text-[0.8125rem]">
                        {s.venue.name}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-4">
                    <div className="font-semibold">{s.test_type.name.replace("IELTS ", "")}</div>
                    <div className="text-board/70 text-[0.8125rem]">{FORMAT_SHORT[s.format]}</div>
                  </td>
                </>
              )}
              {!compact && (
                <td className="px-2 py-4 text-[0.9375rem] capitalize">
                  {s.slot}
                  <div className="text-board/70 font-mono text-[0.75rem] normal-case">
                    {SLOT_TIMES[s.slot]}
                  </div>
                </td>
              )}
              {!compact && (
                <td className="px-2 py-4 font-mono text-[0.9375rem] whitespace-nowrap">
                  {formatNpr(s.fee_npr)}
                </td>
              )}
              {!compact && (
                <td className="px-2 py-4 font-mono text-[0.8125rem]">
                  <div>{formatDate(s.registration_closes_on)}</div>
                  <div className="text-board/70">
                    Results {formatDate(s.results_date, { year: undefined })}
                  </div>
                </td>
              )}
              <td className="px-2 py-4">
                <SeatChip
                  status={s.seat_status}
                  label={s.seat_status === "few_left" ? `${s.seats_left} left` : undefined}
                />
                <span className="sr-only">{s.seat_status_label}</span>
              </td>
              <td className="px-4 py-4 text-right">
                <Action s={s} small wrap={compact} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone: one pass per date */}
      <ul className="divide-board/15 divide-y md:hidden" aria-label={caption}>
        {sessions.map((s, i) => (
          <li
            key={s.id}
            style={{ "--i": i } as React.CSSProperties}
            className={`px-4 py-5 ${rowClass()}`}
          >
            <div className="flex items-start justify-between gap-3">
              <DateCell s={s} />
              <SeatChip
                status={s.seat_status}
                label={s.seat_status === "few_left" ? `${s.seats_left} left` : undefined}
              />
            </div>
            <p className="mt-3 text-lg leading-snug font-semibold">
              {s.test_type.name.replace("IELTS ", "")}
              <span className="text-board/70 font-normal"> · {s.city.name}</span>
            </p>
            <p className="text-board/70 text-[0.9375rem]">
              {FORMAT_SHORT[s.format]} · {s.slot === "morning" ? "Morning" : "Afternoon"}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[0.8125rem]">
              <div>
                <dt className="text-board/70">Fee</dt>
                <dd className="text-[0.9375rem]">{formatNpr(s.fee_npr)}</dd>
              </div>
              {!compact && (
                <div>
                  <dt className="text-board/70">Registration closes</dt>
                  <dd className="text-[0.9375rem]">
                    {formatDate(s.registration_closes_on, { year: undefined })}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4">
              <Action s={s} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BoardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-spruce rounded-md p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton mb-3 h-16 rounded last:mb-0" />
      ))}
    </div>
  );
}
