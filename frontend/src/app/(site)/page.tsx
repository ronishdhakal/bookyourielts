import Link from "next/link";
import { CtaBand } from "@/components/cta-band";
import { DateFinder } from "@/components/date-finder";
import { FaqList } from "@/components/faq-list";
import { SessionList } from "@/components/session-list";
import { pageMetadata } from "@/lib/seo";
import { fetchCities, fetchFaqs, fetchSessions, fetchTestTypes } from "@/lib/server-api";

export const metadata = pageMetadata({
  title: "IELTS Booking in Nepal: Test Dates, Fees & Seats | bookyourielts.com",
  description:
    "IELTS booking in Nepal made simple. See open IELTS test dates in Kathmandu, Pokhara, Chitwan, Butwal and more, check seats and fees, and book your date.",
  path: "/",
});

const STEPS = [
  {
    title: "Choose your exam",
    text: "Pick the provider, test type, format and city. Only dates with seats are shown.",
  },
  {
    title: "Select a date",
    text: "Use the calendar to choose a day and session. Fee and deadlines are shown up front.",
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
    code: "academic",
    name: "IELTS Academic",
    text: "University admission and professional registration.",
  },
  {
    code: "general-training",
    name: "IELTS General Training",
    text: "Work, training and migration, such as Canada or Australia.",
  },
  {
    code: "ukvi-academic",
    name: "IELTS UKVI",
    text: "Academic and General Training for UK visa and immigration.",
  },
  {
    code: "life-skills",
    name: "IELTS Life Skills",
    text: "Speaking and Listening only, for some UK visa routes.",
  },
];

function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="text-crimson mt-0.5 shrink-0"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 10.5l2.7 2.7L14 7.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A thin Himalayan ridge line along the bottom edge of the hero. Decorative only. */
function Ridge() {
  return (
    <svg
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      className="text-spruce/15 absolute inset-x-0 bottom-0 h-16 w-full md:h-20"
      aria-hidden
    >
      <path
        d="M0 88 L120 62 L190 74 L300 30 L360 52 L470 12 L540 46 L640 28 L720 60 L840 20 L930 54 L1040 34 L1130 66 L1250 40 L1340 64 L1440 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default async function HomePage() {
  const [cities, types, upcoming, faqs] = await Promise.all([
    fetchCities(),
    fetchTestTypes(),
    fetchSessions({ hide_closed: "true", page_size: "60" }),
    fetchFaqs("general"),
  ]);
  // One session per day, so the preview shows a range of dates instead of a single busy day.
  const seenDays = new Set<string>();
  const next = (upcoming?.results ?? [])
    .filter((s) => s.is_bookable)
    .filter((s) => (seenDays.has(s.date) ? false : seenDays.add(s.date)))
    .slice(0, 6);
  const cityList = cities ?? [];
  const stats = [
    { n: upcoming?.count ?? 0, label: "open test dates" },
    { n: cityList.length, label: "cities across Nepal" },
    { n: (types ?? []).length, label: "test types" },
    { n: 2, label: "exam providers" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-white-ish border-mist relative overflow-hidden border-b">
        <div className="container-page grid gap-10 pt-10 pb-24 md:pt-16 md:pb-28 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
          <div className="max-w-xl self-center">
            <p className="text-crimson text-[0.9375rem] font-semibold">
              Namaste · IELTS booking in Nepal
            </p>
            <h1 className="mt-3 text-[2.25rem] leading-[1.08] font-bold md:text-[3.25rem]">
              Book your IELTS test date in Nepal
            </h1>
            <p className="text-muted mt-5 text-lg leading-relaxed">
              See which dates are open in your city, how many seats are left and what each test
              costs. Choose a date and book it in a few minutes.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/ielts-test-dates" className="btn btn-primary">
                See all test dates
              </Link>
              <Link
                href="/ielts-booking-nepal"
                className="text-[0.9375rem] font-semibold underline underline-offset-4"
              >
                How booking works
              </Link>
            </div>
            <ul className="mt-8 space-y-2.5 text-[0.9375rem]">
              {[
                "Live seats and fees, updated by our team",
                "British Council and IDP sessions",
                "Your seat is confirmed by a real person",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-paper border-mist rounded-xl border p-5 shadow-[0_1px_2px_rgb(14_31_28/0.06),0_12px_32px_-12px_rgb(14_31_28/0.18)] md:p-6">
            <h2 className="text-xl font-bold">Find your test date</h2>
            <p className="text-muted mt-1 mb-5 text-[0.9375rem]">
              Choose what you need and we will show matching dates.
            </p>
            <DateFinder cities={cityList} types={types ?? []} />
          </div>
        </div>
        <Ridge />
      </section>

      {/* Live numbers */}
      <section aria-label="At a glance" className="border-mist border-b">
        <dl className="container-page divide-mist grid grid-cols-2 divide-x md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-5 first:pl-0 md:px-6 md:first:pl-0">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="text-3xl font-bold tabular-nums">{s.n}</span>
                <span className="text-muted ml-2 text-[0.9375rem]">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Upcoming dates */}
      <section className="container-page pt-16" aria-labelledby="upcoming">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="upcoming" className="text-3xl font-bold">
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
          <div className="border-mist rounded-xl border-2 border-dashed px-6 py-12 text-center">
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

      {/* Process */}
      <section className="container-page pt-20" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-bold">
          How booking works
        </h2>
        <p className="text-muted mt-1 max-w-xl">
          Four short steps. Listening, Reading and Writing are on one day; Speaking is a separate
          slot within about a week.
        </p>
        <ol className="mt-8 grid gap-8 md:grid-cols-4 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-ink border-t-2 pt-4">
              <p className="text-crimson text-sm font-bold tabular-nums">Step {i + 1}</p>
              <h3 className="mt-1 text-lg leading-snug font-bold">{s.title}</h3>
              <p className="text-muted mt-1.5 text-[0.9375rem]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Exams */}
      <section
        className="container-page grid gap-10 pt-20 lg:grid-cols-[0.8fr_1.2fr]"
        aria-labelledby="exams"
      >
        <div>
          <h2 id="exams" className="text-3xl font-bold">
            Which IELTS do you need?
          </h2>
          <p className="text-muted mt-2 max-w-sm">
            Your university, employer or visa authority decides. Not sure? Read our{" "}
            <Link
              href="/ielts-academic-vs-general-training"
              className="text-crimson underline underline-offset-4"
            >
              Academic vs General Training guide
            </Link>
            .
          </p>
        </div>
        <ul className="divide-mist border-mist divide-y border-y">
          {EXAMS.map((e) => (
            <li key={e.code}>
              <Link
                href={`/ielts-test-dates?test_type=${e.code}`}
                className="group hover:bg-ink/[0.02] flex items-center justify-between gap-4 px-1 py-4"
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
      </section>

      {/* Cities */}
      {cityList.length > 0 && (
        <section className="container-page pt-20" aria-labelledby="cities">
          <h2 id="cities" className="text-3xl font-bold">
            Choose your city
          </h2>
          <ul className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {cityList.map((c) => (
              <li key={c.slug} className="border-mist border-b">
                <Link
                  href={`/ielts-test-dates/${c.slug}`}
                  className="group flex min-h-14 items-center justify-between py-3"
                >
                  <span className="font-semibold underline-offset-4 group-hover:underline">
                    IELTS in {c.name}
                  </span>
                  <span className="text-muted text-[0.875rem]">
                    {c.upcoming_count > 0 ? `${c.upcoming_count} dates` : "Ask us"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Trust */}
      <section className="bg-white-ish border-mist mt-20 border-y py-16" aria-labelledby="trust">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="trust" className="text-3xl font-bold">
              Independent, and clear about it
            </h2>
            <p className="text-muted mt-3 max-w-lg text-lg">
              We are not the British Council or IDP, and we do not pretend to be. We keep the open
              dates in one place and guide you through the booking so nothing is missed.
            </p>
          </div>
          <ul className="space-y-5">
            {[
              [
                "What you see is current.",
                "Dates, fees and seats are entered by our team and updated as places fill.",
              ],
              [
                "No online payment.",
                "You pay only after our team confirms your seat and explains exactly what is included.",
              ],
              ["A person looks after your booking.", "Our team answers in English or Nepali."],
            ].map(([b, t]) => (
              <li key={b} className="flex gap-3">
                <Check />
                <p>
                  <strong>{b}</strong> <span className="text-muted">{t}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page pt-20" aria-labelledby="faq">
        <h2 id="faq" className="mb-6 text-3xl font-bold">
          Questions students ask
        </h2>
        <div className="max-w-3xl">
          <FaqList faqs={faqs} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
