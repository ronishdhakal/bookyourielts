import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ScheduleFilters } from "@/components/schedule-filters";
import { ScheduleResults, SpeakingExplainer } from "@/components/schedule-results";
import { CtaBand } from "@/components/cta-band";
import { cleanFilters } from "@/lib/filters";
import { monthLabel } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { fetchCities, fetchSessions, fetchTestTypes } from "@/lib/server-api";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = cleanFilters(await searchParams);
  const filtered = Object.keys(f).length > 0;
  return pageMetadata({
    title: "IELTS Test Dates in Nepal: Open Dates, Fees & Seats",
    description:
      "Live IELTS test dates in Nepal. Filter by city, Academic, General Training, UKVI or Life Skills, computer or paper Writing, and month. See fees and seats, then book on WhatsApp.",
    path: "/ielts-test-dates",
    noindex: filtered,
  });
}

export default async function TestDatesPage({ searchParams }: { searchParams: SP }) {
  const filters = cleanFilters(await searchParams);
  const [cities, types, data] = await Promise.all([
    fetchCities(),
    fetchTestTypes(),
    fetchSessions(filters, 15),
  ]);

  const summary = [
    filters.city && cities?.find((c) => c.slug === filters.city)?.name,
    filters.month && monthLabel(filters.month),
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        crumbs={[{ name: "IELTS test dates", path: "/ielts-test-dates" }]}
        title="IELTS test dates in Nepal"
        lede="Every open date, with fee, seats left and registration deadline. Pick one and finish your booking on WhatsApp."
      />
      <div className="container-page">
        <ScheduleFilters
          basePath="/ielts-test-dates"
          cities={cities ?? []}
          types={types ?? []}
          current={filters}
        />
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
      </div>
      <CtaBand />
    </>
  );
}
