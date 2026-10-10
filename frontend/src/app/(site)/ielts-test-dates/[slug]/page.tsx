import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/cta-band";
import { DatesLanding } from "@/components/dates-landing";
import { DateSearch } from "@/components/date-search";
import { FaqList } from "@/components/faq-list";
import { PageHeader } from "@/components/page-header";
import { ScheduleResults, SpeakingExplainer } from "@/components/schedule-results";
import { cleanFilters } from "@/lib/filters";
import { formatDate, formatNpr, monthLabel } from "@/lib/format";
import {
  clampDescription,
  feeRange,
  summarize,
  updatedLabel,
  wordCount,
  type Inventory,
} from "@/lib/inventory";
import { PROVIDER_PAGES, monthSlug, monthsWithSessions, parseMonthSlug } from "@/lib/landing";
import { isIndexable, landingMetadata, listingPath } from "@/lib/landing-meta";
import { ALWAYS_INDEXABLE_CITIES, SEO_YEAR } from "@/lib/seo-config";
import { fetchCities, fetchOpenSessions, fetchSessions, fetchTestTypes } from "@/lib/server-api";
import type { City, TestSession } from "@/lib/types";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

const FILTER_KEYS = ["city", "provider", "test_type", "test_format", "month", "category"];

type Resolved =
  | { kind: "city"; city: City; cities: City[] }
  | { kind: "month"; month: string; open: TestSession[] }
  | { kind: "provider"; provider: (typeof PROVIDER_PAGES)[number]; open: TestSession[] };

/** A slug under /ielts-test-dates/ is a city, a month (october-2026) or a provider. Anything else is a 404. */
async function resolve(slug: string): Promise<Resolved | null> {
  const cities = (await fetchCities()) ?? [];
  const city = cities.find((c) => c.slug === slug);
  if (city) return { kind: "city", city, cities };
  const all = (await fetchOpenSessions())?.results ?? [];
  const month = parseMonthSlug(slug);
  if (month) {
    const open = all.filter((s) => s.date.startsWith(month));
    return open.length ? { kind: "month", month, open } : null;
  }
  const provider = PROVIDER_PAGES.find((p) => p.slug === slug);
  if (provider) {
    const open = all.filter((s) => s.provider === provider.code);
    return open.length ? { kind: "provider", provider, open } : null;
  }
  return null;
}

/** Unique, factual copy for a city page: only the admin-entered intro and live inventory. */
function cityCopy(city: City, inv: Inventory): string[] {
  const parts = [
    city.intro ||
      `${city.name} is one of the cities in Nepal where IELTS is held. Your session time and test venue are confirmed after you book.`,
  ];
  if (inv.count > 0 && inv.next) {
    const range = feeRange(inv);
    parts.push(
      `${inv.count === 1 ? "There is 1 open date" : `There are ${inv.count} open dates`} for IELTS in ${city.name} right now, the next on ${formatDate(inv.next.date, { weekday: "long" })}. You can book ${inv.typeNames.join(", ")}${range ? `, with fees from ${range.replace(" to ", " up to ")}` : ""}.`,
    );
  } else {
    parts.push(
      `There are no open IELTS dates in ${city.name} right now. New dates are released in batches, so send us an inquiry and we will message you when one opens.`,
    );
  }
  return parts;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await resolve(slug);
  if (!r) return { title: "Page not found", robots: { index: false } };

  if (r.kind === "city") {
    const open =
      (await fetchSessions({ city: r.city.slug, hide_closed: "true", page_size: "100" }))
        ?.results ?? [];
    const inv = summarize(open);
    const desc =
      inv.count && inv.next
        ? `${inv.count} open IELTS ${inv.count === 1 ? "date" : "dates"} in ${r.city.name}, next on ${formatDate(inv.next.date)}. ${inv.typeNames.join(", ")}${inv.minFee !== null ? ` from ${formatNpr(inv.minFee)}` : ""}. Check seats and book.`
        : `IELTS in ${r.city.name}, Nepal: no open dates right now. Ask us and we will message you when a test date opens.`;
    return landingMetadata({
      title: `IELTS Test Dates in ${r.city.name} ${SEO_YEAR}: Fees & Seats`,
      description: clampDescription(desc),
      path: listingPath(`/ielts-test-dates/${r.city.slug}`, sp, FILTER_KEYS),
      indexable:
        ALWAYS_INDEXABLE_CITIES.includes(r.city.slug) ||
        isIndexable(inv.count, wordCount(cityCopy(r.city, inv).join(" "))),
    });
  }
  if (r.kind === "month") {
    const inv = summarize(r.open);
    const label = monthLabel(r.month);
    return landingMetadata({
      title: `IELTS Dates in Nepal, ${label}: Fees & Seats`,
      description: clampDescription(
        `${inv.count} open IELTS ${inv.count === 1 ? "date" : "dates"} in Nepal in ${label}${inv.cityNames.length ? ` (${inv.cityNames.join(", ")})` : ""}.${inv.minFee !== null ? ` Fees from ${formatNpr(inv.minFee)}.` : ""} Check seats and book.`,
      ),
      path: listingPath(`/ielts-test-dates/${monthSlug(r.month)}`, sp, FILTER_KEYS),
      indexable: true,
    });
  }
  const inv = summarize(r.open);
  return landingMetadata({
    title: `${r.provider.label} IELTS Dates in Nepal ${SEO_YEAR}: Fees`,
    description: clampDescription(
      `${inv.count} open IELTS ${inv.count === 1 ? "date" : "dates"} in Nepal run by ${r.provider.label}${inv.minFee !== null ? `, from ${formatNpr(inv.minFee)}` : ""}. We are an independent booking service, not ${r.provider.label}.`,
    ),
    path: listingPath(`/ielts-test-dates/${r.provider.slug}`, sp, FILTER_KEYS),
    indexable: true,
  });
}

const RELATED = [
  { href: "/ielts-test-dates", text: "All IELTS dates in Nepal" },
  { href: "/ielts-fee-nepal", text: "IELTS fee in Nepal: price by test type" },
  { href: "/ielts-booking-nepal", text: "How to book IELTS in Nepal, step by step" },
  { href: "/ielts-on-computer-nepal", text: "IELTS on computer in Nepal" },
];

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await resolve(slug);
  if (!r) notFound();
  const page = cleanFilters(sp).page;
  const path = `/ielts-test-dates/${slug}`;

  if (r.kind === "month") {
    const label = monthLabel(r.month);
    const inv = summarize(r.open);
    const [data, all] = await Promise.all([
      fetchSessions({ month: r.month, hide_closed: "true", ...(page ? { page } : {}) }),
      fetchOpenSessions(),
    ]);
    return (
      <DatesLanding
        path={path}
        crumbs={[
          { name: "IELTS test dates", path: "/ielts-test-dates" },
          { name: label, path },
        ]}
        title={`IELTS test dates in Nepal, ${label}`}
        lede={`Every open IELTS date in ${label}, with fee, seats left and registration deadline.`}
        intro={
          <p>
            {inv.count === 1 ? "There is 1 open date" : `There are ${inv.count} open dates`} in{" "}
            {label}, in {inv.cityNames.join(", ")}. The first is{" "}
            {inv.next ? formatDate(inv.next.date, { weekday: "long" }) : "listed below"}.
            {feeRange(inv) ? ` Fees run ${feeRange(inv)}.` : ""} Registration usually closes about
            six days before each test date.
          </p>
        }
        data={data}
        filters={{ page }}
        caption={`IELTS test dates in Nepal, ${label}`}
        months={monthsWithSessions(all?.results ?? []).filter((m) => m !== r.month)}
        updatedAt={inv.updatedAt}
        faqs={[]}
        related={RELATED}
        ctaTitle={`Want an IELTS date in ${label}?`}
      />
    );
  }

  if (r.kind === "provider") {
    const inv = summarize(r.open);
    const label = r.provider.label;
    const [data, all] = await Promise.all([
      fetchSessions({
        provider: r.provider.code,
        hide_closed: "true",
        ...(page ? { page } : {}),
      }),
      fetchOpenSessions(),
    ]);
    return (
      <DatesLanding
        path={path}
        crumbs={[
          { name: "IELTS test dates", path: "/ielts-test-dates" },
          { name: label, path },
        ]}
        title={`${label} IELTS dates in Nepal`}
        lede={`Open IELTS dates run by ${label}, with fee, seats left and registration deadline.`}
        intro={
          <>
            <p>
              {inv.count === 1
                ? "There is 1 open IELTS date"
                : `There are ${inv.count} open IELTS dates`}{" "}
              in Nepal run by {label}
              {inv.cityNames.length ? `, in ${inv.cityNames.join(", ")}` : ""}.
              {feeRange(inv) ? ` Fees run ${feeRange(inv)}.` : ""}
            </p>
            <p>
              bookyourielts.com is an independent booking service. We are not {label} and are not
              affiliated with or endorsed by them; we only show the dates and help you book.
            </p>
          </>
        }
        data={data}
        filters={{ page }}
        caption={`${label} IELTS dates in Nepal`}
        months={monthsWithSessions(
          (all?.results ?? []).filter((s) => s.provider === r.provider.code),
        )}
        updatedAt={inv.updatedAt}
        faqs={[]}
        related={RELATED}
      />
    );
  }

  /* City */
  const { city, cities } = r;
  const filters = { ...cleanFilters(sp), city: city.slug };
  const [types, data, allCity] = await Promise.all([
    fetchTestTypes(),
    fetchSessions(filters),
    fetchSessions({ city: city.slug, hide_closed: "true", page_size: "100" }),
  ]);
  const inv = summarize(allCity?.results ?? []);
  const first = inv.next;
  const hasWop = inv.open.some((s) => s.format === "computer_wop");
  const paras = cityCopy(city, inv);
  const base = `/ielts-test-dates/${city.slug}`;
  const others = cities.filter((c) => c.slug !== city.slug && c.upcoming_count > 0);
  const updated = updatedLabel(inv.updatedAt);

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
        inv.minFee !== null && inv.maxFee !== null
          ? `Open dates in ${city.name} currently range from ${formatNpr(inv.minFee)} to ${formatNpr(inv.maxFee)}, depending on the test type and format. The exact fee is shown on every date.`
          : `The fee depends on the test type and format and is shown on each date once dates are open in ${city.name}.`,
    },
    ...(inv.count > 0
      ? [
          {
            question: `Which IELTS tests can I book in ${city.name}?`,
            answer: `Right now you can book ${inv.typeNames.join(", ")} in ${city.name} (${inv.formats.join(" and ").toLowerCase()}). Other tests appear here when dates are added.`,
          },
          {
            question: `Can I take IELTS on computer in ${city.name}?`,
            answer: hasWop
              ? `Yes. Both Computer-delivered and Computer-delivered with Writing on Paper are currently offered in ${city.name}.`
              : `Yes, the open ${city.name} dates are computer-delivered. Computer-delivered with Writing on Paper is not on offer in ${city.name} right now.`,
          },
        ]
      : [
          {
            question: `What if there is no date in ${city.name}?`,
            answer: `Send us an inquiry with your preferred test and month.${
              others.length
                ? ` You can also look at ${others
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join(", ")}, which have open dates.`
                : ""
            }`,
          },
        ]),
  ];

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "IELTS test dates", path: "/ielts-test-dates" },
          { name: city.name, path: base },
        ]}
        title={`IELTS test dates in ${city.name}`}
        lede={`Open IELTS dates, fees and seats in ${city.name}.`}
      />
      <div className="container-page">
        <div className="prose-page">
          {paras.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {updated && <p className="text-muted mt-4 text-sm">Last updated {updated}</p>}
        <section className="panel panel-pad mt-6" aria-label="Search by preference">
          <DateSearch
            mode="live"
            basePath={base}
            cities={cities}
            types={types ?? []}
            current={filters}
            lockCity
          />
        </section>
        <div className="mt-6" style={{ minHeight: 360 }}>
          <ScheduleResults
            data={data}
            filters={filters}
            basePath={base}
            caption={`IELTS test dates in ${city.name}`}
            lockedKeys={["city"]}
          />
        </div>
        <div className="mt-8 max-w-3xl">
          <SpeakingExplainer />
        </div>

        {others.length > 0 && (
          <section className="mt-12" aria-labelledby="other-cities">
            <h2 id="other-cities" className="text-2xl font-bold md:text-3xl">
              {inv.count > 0 ? "IELTS dates in other cities" : "Cities with open IELTS dates"}
            </h2>
            <p className="text-muted mt-1 max-w-2xl">
              Students sometimes pick another city to get an earlier date. These cities have open
              dates right now.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {others.map((c) => (
                <li key={c.slug}>
                  <Link href={`/ielts-test-dates/${c.slug}`} className="btn btn-outline btn-sm">
                    IELTS test dates in {c.name} ({c.upcoming_count})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="prose-page mt-12" aria-labelledby="about-city">
          <h2 id="about-city" className="!mt-0">
            Before you book IELTS in {city.name}
          </h2>
          <p>
            Your session (morning or afternoon) and the test venue are confirmed by our team after
            you book. Arrive early on test day with the original passport you used to register. Read
            how <Link href="/ielts-on-computer-nepal">IELTS on computer</Link> works, check the{" "}
            <Link href="/ielts-fee-nepal">IELTS fee in Nepal</Link>, or follow the{" "}
            <Link href="/ielts-booking-nepal">step-by-step booking guide</Link>.
            {inv.count === 0 && (
              <>
                {" "}
                No date yet?{" "}
                <Link href={`/inquire?city=${city.slug}`}>Ask us about IELTS in {city.name}</Link>.
              </>
            )}
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
