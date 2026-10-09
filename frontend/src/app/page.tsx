import Link from "next/link";
import { CtaBand } from "@/components/cta-band";
import { DateFinder } from "@/components/date-finder";
import { FaqList } from "@/components/faq-list";
import { SessionBoard } from "@/components/session-board";
import { fetchCities, fetchFaqs, fetchSessions, fetchTestTypes } from "@/lib/server-api";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "IELTS Booking in Nepal: Test Dates, Fees & Seats | bookyourielts.com",
  description:
    "IELTS booking in Nepal made simple. See open IELTS test dates in Kathmandu, Pokhara, Chitwan, Butwal and more, check seats and fees, and book on WhatsApp.",
  path: "/",
});

const STEPS = [
  {
    title: "Pick a date",
    text: "Filter by city, test type, format and month. Every date shows its fee, seats left and when registration closes.",
  },
  {
    title: "Tap Book via WhatsApp",
    text: "Log in once, check the summary and tap the button. WhatsApp opens with your details already typed.",
  },
  {
    title: "Finish with our team",
    text: "Press send. We confirm your seat, explain payment and tell you what to bring. No payment on this website.",
  },
];

export default async function HomePage() {
  const [cities, types, upcoming, faqs] = await Promise.all([
    fetchCities(),
    fetchTestTypes(),
    fetchSessions({ hide_closed: "true" }),
    fetchFaqs("general"),
  ]);
  const next = (upcoming?.results ?? []).filter((s) => s.is_bookable).slice(0, 5);

  return (
    <>
      <section className="container-page grid gap-10 pt-8 pb-14 md:pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <div>
          <p className="eyebrow">Namaste · IELTS booking in Nepal</p>
          <h1 className="mt-3 text-[2.5rem] font-extrabold md:text-[3.75rem] lg:text-[4.25rem]">
            IELTS booking in Nepal, finished on WhatsApp
          </h1>
          <p className="text-muted mt-5 max-w-xl text-lg md:text-xl">
            See which IELTS dates are open in your city, how many seats are left and what it costs.
            Choose one, tap a button, and our team takes it from there.
          </p>
          <div className="mt-8 max-w-xl">
            <DateFinder cities={cities ?? []} types={types ?? []} />
          </div>
        </div>

        <div className="min-w-0" style={{ minHeight: 420 }}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="eyebrow !text-ink font-mono text-sm font-medium">Next open dates</h2>
            <Link
              href="/ielts-test-dates"
              className="text-crimson text-[0.9375rem] font-semibold underline underline-offset-4"
            >
              See all dates
            </Link>
          </div>
          {next.length > 0 ? (
            <SessionBoard sessions={next} compact animate caption="Next open IELTS test dates" />
          ) : (
            <div className="bg-spruce text-board rounded-md p-6">
              <p className="text-xl font-semibold">New dates are being added.</p>
              <p className="text-board/80 mt-2">
                Tell us your city and test type and we will message you the moment a date opens.
              </p>
              <Link href="/inquire" className="btn btn-primary mt-5">
                Inquire about upcoming dates
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-mist bg-white-ish border-y py-16" aria-labelledby="how">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="how" className="text-3xl font-extrabold md:text-4xl">
              How booking works
            </h2>
            <p className="text-muted mt-3 max-w-sm text-lg">
              Three steps, about a minute on your phone. Listening, Reading and Writing are on one
              day; Speaking is a separate short slot within about a week of it.
            </p>
          </div>
          <ol className="divide-mist divide-y">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                <span
                  className="font-display text-crimson w-10 shrink-0 text-4xl leading-none font-extrabold"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="text-muted mt-1 max-w-lg">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {cities && cities.length > 0 && (
        <section className="container-page py-16" aria-labelledby="cities">
          <h2 id="cities" className="text-3xl font-extrabold md:text-4xl">
            Choose your city
          </h2>
          <p className="text-muted mt-2 max-w-xl text-lg">
            Test dates are held in {cities.length} cities across Nepal.
          </p>
          <ul className="border-ink mt-8 grid border-t-2 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {cities.map((c) => (
              <li key={c.slug} className="border-mist border-b">
                <Link
                  href={`/ielts-test-dates/${c.slug}`}
                  className="group flex min-h-14 items-center justify-between py-3"
                >
                  <span className="text-lg font-semibold underline-offset-4 group-hover:underline">
                    IELTS in {c.name}
                  </span>
                  <span className="text-muted font-mono text-sm">
                    {c.upcoming_count > 0 ? `${c.upcoming_count} dates` : "Ask us"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-page pb-4" aria-labelledby="trust">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="trust" className="text-3xl font-extrabold md:text-4xl">
              An independent booking helper, and honest about it
            </h2>
            <p className="text-muted mt-4 max-w-lg text-lg">
              We are not the British Council or IDP, and we do not pretend to be. We save you time
              by keeping the open dates in one place and walking you through the booking on
              WhatsApp.
            </p>
          </div>
          <ul className="space-y-4 text-lg">
            {[
              [
                "You see what we see.",
                "Dates, fees and seats are entered by our own team and updated as places fill.",
              ],
              [
                "No online payment.",
                "You pay only after you have chatted with us and know exactly what is included.",
              ],
              ["A person replies.", "WhatsApp messages go to our team, in English or Nepali."],
            ].map(([b, t]) => (
              <li key={b} className="border-crimson border-l-4 pl-4">
                <strong>{b}</strong> <span className="text-muted">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page mt-20" aria-labelledby="faq">
        <h2 id="faq" className="mb-6 text-3xl font-extrabold md:text-4xl">
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
