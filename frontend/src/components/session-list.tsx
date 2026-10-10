import { ProviderLogo } from "./provider-logo";
import Link from "next/link";
import { FORMAT_SHORT, formatDate, formatNpr } from "@/lib/format";
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

function Action({ s, block = false }: { s: TestSession; block?: boolean }) {
  const width = block ? "w-full" : "";
  if (s.is_bookable) {
    return (
      <Link
        href={appHref(`/dates?session=${s.id}`)}
        className={`btn btn-primary btn-sm whitespace-nowrap ${width}`}
        rel="nofollow"
        aria-label={`Book ${s.test_type.name} in ${s.city.name} on ${formatDate(s.date)}`}
      >
        Book this date
      </Link>
    );
  }
  return (
    <Link href={inquireHref(s)} className={`btn btn-outline btn-sm whitespace-nowrap ${width}`}>
      Ask about similar dates
    </Link>
  );
}

/**
 * Open test dates, rendered once. From tablet width up it is a data table; on phones each row
 * becomes a stacked card (same markup, so crawlers and screen readers see every date one time).
 * `compact` drops the deadline columns for short previews.
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
  const th = "px-3 py-3 font-semibold";
  return (
    <div className="panel overflow-hidden">
      <table className="block w-full text-left text-[0.9375rem] md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-mist text-muted sr-only border-b bg-[#f7f8fa] text-[0.8125rem] md:not-sr-only md:table-header-group">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Test date
            </th>
            <th scope="col" className={th}>
              Exam
            </th>
            <th scope="col" className={th}>
              City
            </th>
            <th scope="col" className={th}>
              Format
            </th>
            {!compact && (
              <th scope="col" className={th}>
                Register by
              </th>
            )}
            {!compact && (
              <th scope="col" className={th}>
                Results from
              </th>
            )}
            <th scope="col" className={th}>
              Fee
            </th>
            <th scope="col" className={th}>
              Seats
            </th>
            <th scope="col" className="px-5 py-3">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-mist block divide-y md:table-row-group">
          {sessions.map((s) => (
            <tr
              key={s.id}
              className="grid grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-4 hover:bg-[#fafbfc] md:table-row md:p-0"
            >
              <td className="order-1 font-semibold md:table-cell md:px-5 md:py-3.5 md:whitespace-nowrap">
                {formatDate(s.date, { weekday: "short" })}
              </td>
              <td className="order-3 col-span-2 md:table-cell md:px-3 md:py-3.5">
                <p className="flex items-center gap-2 leading-snug font-semibold">
                  <ProviderLogo provider={s.provider} label={s.provider_label} height={28} />
                  <span>{s.test_type.name}</span>
                </p>
              </td>
              <td className="text-muted md:text-ink order-4 text-[0.875rem] md:table-cell md:px-3 md:py-3.5 md:text-[0.9375rem]">
                {s.city.name}
              </td>
              <td className="text-muted md:text-ink order-5 text-right text-[0.875rem] md:table-cell md:px-3 md:py-3.5 md:text-left md:text-[0.9375rem]">
                {FORMAT_SHORT[s.format]}
              </td>
              {!compact && (
                <td className="text-muted md:text-ink order-6 col-span-2 mt-1 text-[0.8125rem] before:content-['Register_by_'] md:table-cell md:px-3 md:py-3.5 md:text-[0.9375rem] md:whitespace-nowrap md:before:content-none">
                  {formatDate(s.registration_closes_on, { year: undefined })}
                </td>
              )}
              {!compact && (
                <td className="text-muted md:text-ink order-7 col-span-2 text-[0.8125rem] before:content-['Results_from_'] md:table-cell md:px-3 md:py-3.5 md:text-[0.9375rem] md:whitespace-nowrap md:before:content-none">
                  {formatDate(s.results_date, { year: undefined })}
                </td>
              )}
              <td className="order-8 mt-2 font-semibold md:table-cell md:px-3 md:py-3.5 md:whitespace-nowrap">
                {formatNpr(s.fee_npr)}
              </td>
              <td className="order-2 justify-self-end md:table-cell md:px-3 md:py-3.5">
                <SeatChip status={s.seat_status} />
              </td>
              <td className="order-9 mt-2 justify-self-end md:table-cell md:px-5 md:py-3.5 md:text-right">
                <Action s={s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-mist text-muted border-t bg-[#f7f8fa] px-5 py-3 text-[0.8125rem]">
        Only the city is fixed on a date. Your session (morning or afternoon) and the test venue are
        confirmed by our team after you book.
      </p>
    </div>
  );
}
