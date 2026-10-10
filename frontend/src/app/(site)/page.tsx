import { ProviderLogo } from "@/components/provider-logo";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/cta-band";
import { DateSearch } from "@/components/date-search";
import { FaqList } from "@/components/faq-list";
import { InquiryForm } from "@/components/inquiry-form";
import { SessionList } from "@/components/session-list";
import { appHref } from "@/lib/portal";
import { formatDate, formatNpr } from "@/lib/format";
import { clampDescription, feeRange, summarize } from "@/lib/inventory";
import { TYPE_PAGES } from "@/lib/landing";
import { SEO_YEAR } from "@/lib/seo-config";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, websiteLd } from "@/lib/seo";
import { fetchCities, fetchFaqs, fetchOpenSessions, fetchTestTypes } from "@/lib/server-api";

export async function generateMetadata(): Promise<Metadata> {
  const inv = summarize((await fetchOpenSessions())?.results ?? []);
  const where = inv.cityNames.length ? ` in ${inv.cityNames.join(", ")}` : "";
  return pageMetadata({
    // Absolute title: the home page carries no brand suffix.
    title: `IELTS Booking in Nepal ${SEO_YEAR}: Dates, Fees & Seats`,
    description: clampDescription(
      inv.count
        ? `IELTS booking in Nepal: ${inv.count} open ${inv.count === 1 ? "date" : "dates"}${where}${inv.minFee !== null ? `, fees from ${formatNpr(inv.minFee)}` : ""}. Check seats and book your IELTS date online.`
        : "IELTS booking in Nepal made simple. Check IELTS dates, fees and seats, and book online. No dates are open right now; ask us and we will message you.",
    ),
    path: "/",
  });
}

const STEPS = [
  {
    title: "Choose your exam",
    text: "Pick the provider, test type, format and city. Only dates with seats are shown.",
  },
  {
    title: "Select a date",
    text: "Use the calendar to choose a day. Fee and deadlines are shown before you continue.",
  },
  {
    title: "Add your details",
    text: "Enter the candidate's details as on the passport. A passport photo is optional.",
  },
  {
    title: "Confirm with our team",
    text: "In the last step we hand you to our team, who confirm your seat and explain payment.",
  },
];

const EXAMS = [
  {
    path: TYPE_PAGES[0]?.path ?? "/ielts-test-dates",
    code: "academic",
    name: "IELTS Academic",
    text: "University admission and professional registration.",
  },
  {
    path: TYPE_PAGES[1]?.path ?? "/ielts-test-dates",
    code: "general-training",
    name: "IELTS General Training",
    text: "Work, training and migration, such as Canada or Australia.",
  },
  {
    path: TYPE_PAGES[2]?.path ?? "/ielts-test-dates",
    code: "ukvi-academic",
    name: "IELTS UKVI",
    text: "Academic and General Training for UK visa and immigration.",
  },
  {
    path: TYPE_PAGES[3]?.path ?? "/ielts-test-dates",
    code: "life-skills",
    name: "IELTS Life Skills",
    text: "Speaking and Listening only, for some UK visa routes.",
  },
];

export default async function HomePage() {
  const [cities, types, upcoming, generalFaqs] = await Promise.all([
    fetchCities(),
    fetchTestTypes(),
    fetchOpenSessions(),
    fetchFaqs("general"),
  ]);
  const inv = summarize(upcoming?.results ?? []);
  const range = feeRange(inv);
  // One session per day, so the preview shows a range of dates instead of a single busy day.
  const seenDays = new Set<string>();
  const next = (upcoming?.results ?? [])
    .filter((s) => s.is_bookable)
    .filter((s) => (seenDays.has(s.date) ? false : seenDays.add(s.date)))
    .slice(0, 6);
  const cityList = cities ?? [];
  const citiesWithDates = cityList.filter((c) => c.upcoming_count > 0);
  const faqs = [
    {
      question: `How much does IELTS cost in Nepal in ${SEO_YEAR}?`,
      answer: range
        ? `On the dates we list right now, the IELTS price in Nepal runs ${range}, depending on the test type and format. The fee is shown on every date. See the IELTS fee page for the full breakdown.`
        : "The IELTS price in Nepal depends on the test type and format. It is shown on each date once dates are open.",
    },
    {
      question: "When is the next IELTS date in Nepal?",
      answer: inv.next
        ? `The next open IELTS date in Nepal is ${formatDate(inv.next.date, { weekday: "long" })} in ${inv.next.city.name} (${inv.next.test_type.name}). Registration for it closes on ${formatDate(inv.next.registration_closes_on)}.`
        : "No IELTS dates are open right now. New dates are released in batches, so send us an inquiry and we will message you when one opens.",
    },
    ...generalFaqs.slice(0, 2),
  ];

  return (
    <>
      {/* Hero */}
      <section className="on-dark bg-ink text-white">
        <div className="container-page grid gap-8 pt-12 pb-28 md:pt-16 md:pb-32 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[0.9375rem] font-semibold text-white/70">Namaste</p>
            <h1 className="mt-3 text-[2.25rem] leading-[1.1] font-bold md:text-5xl">
              IELTS booking in Nepal: pick your test date
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">
              Find the IELTS date in Nepal that suits you, see the IELTS price for each test type,
              and finish your booking in a few steps. Seats and fees are shown before you book.
            </p>
            <a
              href={appHref("/dates")}
              className="btn btn-primary mt-6 !min-h-[3.25rem] px-8 text-base"
            >
              Book Your IELTS
            </a>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-white/20 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            {[
              [String(inv.count), "open dates"],
              [String(citiesWithDates.length), "cities with open dates"],
              [String(inv.providers.length), "providers with open dates"],
            ].map(([n, l]) => (
              <div key={l}>
                <dd className="text-3xl font-bold">{n}</dd>
                <dt className="text-sm text-white/70">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Search panel overlaps the hero edge */}
      <section aria-labelledby="search" className="container-page relative z-10 -mt-20 md:-mt-24">
        <div className="panel panel-pad shadow-[0_8px_28px_-12px_rgb(29_33_39/0.25)]">
          <h2 id="search" className="mb-5 text-xl font-bold">
            Search test dates
          </h2>
          <DateSearch cities={cityList} types={types ?? []} />
        </div>
      </section>

      <section aria-label="Exam providers" className="container-page pt-10">
        <div className="border-mist flex flex-wrap items-center gap-x-10 gap-y-4 border-y py-5">
          <p className="text-muted text-[0.9375rem] font-medium">Test dates from</p>
          <ProviderLogo provider="british_council" label="British Council" height={44} />
          <ProviderLogo provider="idp" label="IDP" height={44} />
          <p className="text-muted text-[0.8125rem] sm:ml-auto sm:max-w-sm">
            Independent booking help. Not affiliated with or endorsed by either organisation.
          </p>
        </div>
      </section>

      {/* Upcoming dates */}
      <section className="container-page pt-16" aria-labelledby="upcoming">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="upcoming" className="text-2xl font-bold md:text-3xl">
              Upcoming test dates
            </h2>
            <p className="text-muted mt-1">The next dates with seats available.</p>
          </div>
          <Link
            href="/ielts-test-dates"
            className="text-crimson font-semibold underline underline-offset-4"
          >
            View all dates
          </Link>
        </div>
        {next.length > 0 ? (
          <SessionList sessions={next} compact caption="Upcoming IELTS test dates" />
        ) : (
          <div className="panel px-6 py-12 text-center">
            <p className="text-xl font-semibold">New dates are being added.</p>
            <p className="text-muted mt-1">
              Tell us your city and test type and we will contact you when a date opens.
            </p>
            <Link href="/inquire" className="btn btn-primary mt-5">
              Inquire about upcoming dates
            </Link>
          </div>
        )}
      </section>

      {/* Fee snapshot */}
      <section className="container-page pt-16" aria-labelledby="fee-snapshot">
        <div className="panel panel-pad flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="fee-snapshot" className="text-2xl font-bold md:text-3xl">
              IELTS fee in Nepal {SEO_YEAR}
            </h2>
            <p className="text-muted mt-1 max-w-xl">
              {range
                ? `IELTS fee in Nepal ${SEO_YEAR}: ${range}, depending on the test type and format.`
                : "The fee is shown on each date once dates are open."}
            </p>
          </div>
          <Link href="/ielts-fee-nepal" className="btn btn-outline whitespace-nowrap">
            See the IELTS fee by test type
          </Link>
        </div>
      </section>

      {/* Process */}
      <section className="container-page pt-20" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold md:text-3xl">
          How booking works
        </h2>
        <p className="text-muted mt-1 max-w-2xl">
          Four short steps. Listening, Reading and Writing are on one day; Speaking is a separate
          slot within about a week.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel p-6">
              <span className="bg-crimson inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="text-muted mt-1.5 text-[0.9375rem]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Exams and cities */}
      <section className="container-page grid gap-10 pt-20 lg:grid-cols-2 lg:gap-16">
        <div aria-labelledby="exams">
          <h2 id="exams" className="text-2xl font-bold md:text-3xl">
            Which IELTS do you need?
          </h2>
          <p className="text-muted mt-1 mb-5">
            Your university, employer or visa authority decides. Not sure? Read the{" "}
            <Link
              href="/ielts-academic-vs-general-training"
              className="text-crimson underline underline-offset-4"
            >
              Academic vs General Training guide
            </Link>
            .
          </p>
          <ul className="panel divide-mist divide-y overflow-hidden">
            {EXAMS.map((e) => (
              <li key={e.code}>
                <Link
                  href={e.path}
                  className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafbfc]"
                >
                  <span>
                    <span className="block font-semibold">{e.name}</span>
                    <span className="text-muted block text-[0.9375rem]">{e.text}</span>
                  </span>
                  <span
                    aria-hidden
                    className="text-crimson text-xl transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {cityList.length > 0 && (
          <div aria-labelledby="cities">
            <h2 id="cities" className="text-2xl font-bold md:text-3xl">
              Cities where IELTS is held
            </h2>
            <p className="text-muted mt-1 mb-5">
              IELTS is held in {cityList.length} cities across Nepal.{" "}
              {citiesWithDates.length > 0
                ? `${citiesWithDates.length === 1 ? "One city has" : `${citiesWithDates.length} cities have`} open dates right now.`
                : "No city has open dates right now."}
            </p>
            <ul className="panel grid overflow-hidden sm:grid-cols-2">
              {cityList.map((c) => (
                <li key={c.slug} className="border-mist border-b sm:odd:border-r">
                  <Link
                    href={`/ielts-test-dates/${c.slug}`}
                    className="group flex min-h-14 items-center justify-between px-5 py-3 hover:bg-[#fafbfc]"
                  >
                    <span className="font-semibold underline-offset-4 group-hover:underline">
                      {c.name}
                    </span>
                    <span className="text-muted text-[0.875rem]">
                      {c.upcoming_count > 0 ? `${c.upcoming_count} dates` : "No dates yet"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Trust */}
      <section className="container-page pt-20" aria-labelledby="trust">
        <h2 id="trust" className="text-2xl font-bold md:text-3xl">
          Independent, and clear about it
        </h2>
        <p className="text-muted mt-1 max-w-2xl">
          We are not the British Council or IDP, and we do not pretend to be. We keep the open dates
          in one place and guide you through the booking so nothing is missed.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            [
              "What you see is current",
              "Dates, fees and seats are entered by our team and updated as places fill.",
            ],
            [
              "No online payment",
              "You pay only after our team confirms your seat and explains exactly what is included.",
            ],
            ["A person looks after your booking", "Our team answers in English or Nepali."],
          ].map(([b, t]) => (
            <div key={b} className="border-crimson border-l-4 bg-white py-4 pr-5 pl-5">
              <h3 className="font-bold">{b}</h3>
              <p className="text-muted mt-1 text-[0.9375rem]">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pt-20" aria-labelledby="faq">
        <h2 id="faq" className="mb-5 text-2xl font-bold md:text-3xl">
          Questions students ask
        </h2>
        <div className="panel max-w-4xl px-5 md:px-8">
          <FaqList faqs={faqs} />
        </div>
      </section>

      <section id="ask" className="container-page scroll-mt-28 pt-20" aria-labelledby="ask-h">
        <div className="panel grid gap-8 p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
          <div>
            <h2 id="ask-h" className="text-2xl font-bold md:text-3xl">
              Have a question?
            </h2>
            <p className="text-muted mt-2 max-w-md">
              Ask us anything about booking IELTS in Nepal: fees, formats, documents or which test
              you need. Our team replies in English or Nepali.
            </p>
            <p className="mt-4">
              Need a date that is not listed?{" "}
              <Link
                href="/inquire"
                className="text-crimson font-semibold underline underline-offset-4"
              >
                Tell us which date you need
              </Link>
              .
            </p>
          </div>
          <InquiryForm variant="general" idPrefix="home" />
        </div>
      </section>

      <CtaBand />
      <JsonLd data={websiteLd()} />
    </>
  );
}
