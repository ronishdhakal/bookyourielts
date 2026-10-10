import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DateSearch } from "@/components/date-search";
import { ScheduleResults, SpeakingExplainer } from "@/components/schedule-results";
import { CtaBand } from "@/components/cta-band";
import { cleanFilters } from "@/lib/filters";
import { formatDate, formatNpr, monthLabel } from "@/lib/format";
import { clampDescription, feeRange, summarize, updatedLabel } from "@/lib/inventory";
import { TYPE_PAGES, monthSlug, monthsWithSessions } from "@/lib/landing";
import { listingPath } from "@/lib/landing-meta";
import { SEO_YEAR } from "@/lib/seo-config";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, webPageLd } from "@/lib/seo";
import { fetchCities, fetchOpenSessions, fetchSessions, fetchTestTypes } from "@/lib/server-api";

type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTER_KEYS = ["city", "provider", "test_type", "test_format", "month", "category"];

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const inv = summarize((await fetchOpenSessions())?.results ?? []);
  const description =
    inv.count && inv.next
      ? `${inv.count} open IELTS ${inv.count === 1 ? "date" : "dates"} in Nepal, next on ${formatDate(inv.next.date)}. ${inv.typeNames.join(", ")}${inv.minFee !== null ? ` from ${formatNpr(inv.minFee)}` : ""}. Live seats and fees.`
      : "IELTS test dates in Nepal with fees and seats. No dates are open right now; ask us and we will message you when one opens.";
  return pageMetadata({
    title: `IELTS Dates in Nepal ${SEO_YEAR}: Live Seats & Fees | BookYourIELTS`,
    description: clampDescription(description),
    path: listingPath("/ielts-test-dates", sp, FILTER_KEYS),
  });
}

export default async function TestDatesPage({ searchParams }: { searchParams: SP }) {
  const filters = cleanFilters(await searchParams);
  const [cities, types, data, all] = await Promise.all([
    fetchCities(),
    fetchTestTypes(),
    fetchSessions(filters),
    fetchOpenSessions(),
  ]);

  const summary = [
    filters.city && cities?.find((c) => c.slug === filters.city)?.name,
    filters.month && monthLabel(filters.month),
  ].filter(Boolean);
  const openSessions = all?.results ?? [];
  const inv = summarize(openSessions);
  const updated = updatedLabel(inv.updatedAt);
  const months = monthsWithSessions(openSessions);

  return (
    <>
      <PageHeader
        crumbs={[{ name: "IELTS test dates", path: "/ielts-test-dates" }]}
        title={`IELTS test dates in Nepal (${SEO_YEAR})`}
        lede="Every open date, with fee, seats left and registration deadline. Pick one and book it in a few steps."
      />
      <div className="container-page">
        <div className="prose-page">
          <p>
            {inv.count > 0 && inv.next ? (
              <>
                Looking for an IELTS date in Nepal? There {inv.count === 1 ? "is" : "are"}{" "}
                <strong>
                  {inv.count} open {inv.count === 1 ? "date" : "dates"}
                </strong>{" "}
                right now in {inv.cityNames.join(", ")}, and the next test is on{" "}
                {formatDate(inv.next.date, { weekday: "long" })}.
                {feeRange(inv)
                  ? ` The IELTS price in Nepal on these dates runs ${feeRange(inv)}.`
                  : ""}{" "}
                Registration usually closes about six days before the test.
              </>
            ) : (
              <>
                No IELTS dates are open in Nepal right now. New dates are released in batches, so
                send us an inquiry and we will message you when one opens.
              </>
            )}
          </p>
        </div>
        {updated && <p className="text-muted mt-4 text-sm">Last updated {updated}</p>}
        {months.length > 0 && (
          <nav aria-label="IELTS dates by month" className="mt-5 flex flex-wrap gap-2">
            {months.map((m) => (
              <Link
                key={m}
                href={`/ielts-test-dates/${monthSlug(m)}`}
                className="btn btn-outline btn-sm"
              >
                IELTS dates in {monthLabel(m)}
              </Link>
            ))}
          </nav>
        )}
        <section className="panel panel-pad mt-6" aria-label="Search by preference">
          <DateSearch
            mode="live"
            basePath="/ielts-test-dates"
            cities={cities ?? []}
            types={types ?? []}
            current={filters}
          />
        </section>
        <div className="mt-6" style={{ minHeight: 480 }}>
          <ScheduleResults
            data={data}
            filters={filters}
            basePath="/ielts-test-dates"
            caption={`IELTS test dates${summary.length ? `: ${summary.join(", ")}` : ""}`}
          />
        </div>
        <div className="mt-8 max-w-3xl">
          <SpeakingExplainer />
        </div>
        <section className="prose-page mt-12" aria-labelledby="by-type">
          <h2 id="by-type" className="!mt-0">
            IELTS dates by test type
          </h2>
          <ul>
            {TYPE_PAGES.map((t) => (
              <li key={t.path}>
                <Link href={t.path}>{t.label} dates in Nepal</Link>: {t.purpose}
              </li>
            ))}
          </ul>
          <p>
            New to booking? Read <Link href="/ielts-booking-nepal">how to book IELTS in Nepal</Link>{" "}
            or check the <Link href="/ielts-fee-nepal">IELTS fee in Nepal</Link>.
          </p>
        </section>
      </div>
      <CtaBand />
      <JsonLd
        data={webPageLd({
          path: "/ielts-test-dates",
          name: "IELTS test dates in Nepal",
          dateModified: inv.updatedAt,
        })}
      />
    </>
  );
}
