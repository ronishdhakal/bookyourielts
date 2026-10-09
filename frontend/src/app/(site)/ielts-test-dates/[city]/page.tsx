import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/cta-band";
import { FaqList } from "@/components/faq-list";
import { PageHeader } from "@/components/page-header";
import { ScheduleFilters } from "@/components/schedule-filters";
import { ScheduleResults, SpeakingExplainer } from "@/components/schedule-results";
import { cleanFilters } from "@/lib/filters";
import { formatDate, formatNpr } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { fetchCities, fetchSessions, fetchTestTypes } from "@/lib/server-api";

type Params = Promise<{ city: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

async function loadCity(slug: string) {
  const cities = await fetchCities();
  return { cities: cities ?? [], city: cities?.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city: slug } = await params;
  const { city } = await loadCity(slug);
  if (!city) return { title: "City not found", robots: { index: false } };
  return pageMetadata({
    title: `IELTS Test Dates in ${city.name}: Fees, Seats & Booking`,
    description: `Open IELTS test dates in ${city.name}, Nepal. Check Academic, General Training and UKVI seats and fees, then book your IELTS in ${city.name}.`,
    path: `/ielts-test-dates/${city.slug}`,
  });
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { city: slug } = await params;
  const { cities, city } = await loadCity(slug);
  if (!city) notFound();

  const filters = { ...cleanFilters(await searchParams), city: city.slug };
  const base = `/ielts-test-dates/${city.slug}`;
  const [types, data, all] = await Promise.all([
    fetchTestTypes(),
    fetchSessions(filters, 15),
    fetchSessions({ city: city.slug, hide_closed: "true", page_size: "100" }, 60),
  ]);

  const open = all?.results.filter((s) => s.is_bookable) ?? [];
  const first = open[0];
  const fees = open.map((s) => s.fee_npr);
  const typeNames = [...new Set(open.map((s) => s.test_type.name))];
  const hasWop = open.some((s) => s.format === "computer_wop");
  const venue = open.find((s) => s.venue)?.venue;

  const cityFaqs = [
    {
      question: `When is the next IELTS test in ${city.name}?`,
      answer: first
        ? `The next open date in ${city.name} is ${formatDate(first.date, { weekday: "long" })} (${first.test_type.name}, ${first.format_label.toLowerCase()}). Registration for it closes on ${formatDate(first.registration_closes_on)}.`
        : `There are no open dates listed for ${city.name} right now. New dates are released in batches, so send us an inquiry and we will message you when one opens.`,
    },
    {
      question: `How much does IELTS cost in ${city.name}?`,
      answer:
        fees.length > 0
          ? `Open dates in ${city.name} currently range from ${formatNpr(Math.min(...fees))} to ${formatNpr(Math.max(...fees))}, depending on the test type and format. The exact fee is shown on every date.`
          : `The fee depends on the test type and format and is shown on each date once dates are open in ${city.name}.`,
    },
    {
      question: `Can I take IELTS on computer in ${city.name}?`,
      answer: hasWop
        ? `Yes. Both Computer-delivered and Computer-delivered with Writing on Paper are currently offered in ${city.name}.`
        : `Computer-delivered IELTS is the standard format. Computer-delivered with Writing on Paper is offered at fewer centres, so check the format shown on each ${city.name} date.`,
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "IELTS test dates", path: "/ielts-test-dates" },
          { name: city.name, path: base },
        ]}
        title={`IELTS test dates in ${city.name}`}
        lede={city.intro || `Open IELTS dates, fees and seats in ${city.name}.`}
      />
      <div className="container-page">
        <ScheduleFilters
          basePath={base}
          cities={cities}
          types={types ?? []}
          current={filters}
          lockCity
        />
        <div className="mt-6" style={{ minHeight: 360 }}>
          <ScheduleResults
            data={data}
            filters={filters}
            basePath={base}
            caption={`IELTS test dates in ${city.name}`}
          />
        </div>
        <div className="mt-8 max-w-3xl">
          <SpeakingExplainer />
        </div>

        <section className="prose-page mt-16" aria-labelledby="about-city">
          <h2 id="about-city" className="!mt-0">
            Taking IELTS in {city.name}
          </h2>
          <p>
            {city.name} is one of the cities in Nepal where IELTS is held.
            {typeNames.length > 0 && ` Right now you can book ${typeNames.join(", ")} here.`}
            {venue &&
              ` Test sessions are held at ${venue.name}${venue.address ? `, ${venue.address}` : ""}.`}{" "}
            Arrive early on test day with your original passport, the same one you used to register.
          </p>
          <p>
            Not in {city.name}? Students often choose a different city to get an earlier date.
            Compare <Link href="/ielts-test-dates">all cities</Link> or read how{" "}
            <Link href="/ielts-on-computer-nepal">IELTS on computer</Link> and{" "}
            <Link href="/ielts-fee-nepal">IELTS fees</Link> work.
          </p>
        </section>

        <section className="mt-12 max-w-3xl" aria-labelledby="city-faq">
          <h2 id="city-faq" className="mb-4 text-3xl font-bold">
            IELTS in {city.name}: common questions
          </h2>
          <FaqList faqs={cityFaqs} />
        </section>
      </div>
      <CtaBand title={`Want an IELTS date in ${city.name}?`} />
    </>
  );
}
