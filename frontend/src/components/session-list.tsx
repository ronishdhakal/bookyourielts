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
        aria-label={`Book this date: ${s.test_type.name}, ${s.city.name}, ${formatDate(s.date)}`}
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
 * Open test dates: a plain data table from tablet width up, stacked rows on phones.
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
  return (
    <div className="panel overflow-hidden">
      <table className="hidden w-full text-left text-[0.9375rem] md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-mist text-muted border-b bg-[#f7f8fa] text-[0.8125rem]">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Test date
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Exam
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              City
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Format
            </th>
            {!compact && (
              <th scope="col" className="px-3 py-3 font-semibold">
                Register by
              </th>
            )}
            {!compact && (
              <th scope="col" className="px-3 py-3 font-semibold">
                Results from
              </th>
            )}
            <th scope="col" className="px-3 py-3 font-semibold">
              Fee
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Seats
            </th>
            <th scope="col" className="px-5 py-3">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-mist divide-y">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-[#fafbfc]">
              <td className="px-5 py-3.5 whitespace-nowrap">
                <p className="font-semibold">{formatDate(s.date, { weekday: "short" })}</p>
              </td>
              <td className="px-3 py-3.5">
                <p className="flex items-center gap-2 font-semibold">
                  <ProviderLogo provider={s.provider} label={s.provider_label} height={32} />
                  <span>{s.test_type.name}</span>
                </p>
              </td>
              <td className="px-3 py-3.5">{s.city.name}</td>
              <td className="px-3 py-3.5">{FORMAT_SHORT[s.format]}</td>
              {!compact && (
                <td className="px-3 py-3.5 whitespace-nowrap">
                  {formatDate(s.registration_closes_on, { year: undefined })}
                </td>
              )}
              {!compact && (
                <td className="px-3 py-3.5 whitespace-nowrap">
                  {formatDate(s.results_date, { year: undefined })}
                </td>
              )}
              <td className="px-3 py-3.5 font-semibold whitespace-nowrap">
                {formatNpr(s.fee_npr)}
              </td>
              <td className="px-3 py-3.5">
                <SeatChip status={s.seat_status} />
              </td>
              <td className="px-5 py-3.5 text-right">
                <Action s={s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-mist divide-y md:hidden" aria-label={caption}>
        {sessions.map((s) => (
          <li key={s.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{formatDate(s.date, { weekday: "short" })}</p>
                <p className="mt-0.5 flex items-center gap-2 leading-snug">
                  <ProviderLogo provider={s.provider} label={s.provider_label} height={28} />
                  <span>{s.test_type.name}</span>
                </p>
                <p className="text-muted text-[0.875rem]">
                  {s.city.name} · {FORMAT_SHORT[s.format]}
                </p>
              </div>
              <SeatChip status={s.seat_status} />
            </div>
            {!compact && (
              <p className="text-muted mt-2 text-[0.8125rem]">
                Register by {formatDate(s.registration_closes_on, { year: undefined })} · Results
                from {formatDate(s.results_date, { year: undefined })}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="font-semibold">{formatNpr(s.fee_npr)}</p>
              <Action s={s} />
            </div>
          </li>
        ))}
      </ul>
      <p className="border-mist text-muted border-t bg-[#f7f8fa] px-5 py-3 text-[0.8125rem]">
        Only the city is fixed on a date. Your session (morning or afternoon) and the test venue are
        confirmed by our team after you book.
      </p>
    </div>
  );
}
