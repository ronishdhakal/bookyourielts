import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";
import { SEO_YEAR } from "@/lib/seo-config";
import { fetchCities, fetchFaqs } from "@/lib/server-api";

export const metadata = pageMetadata({
  title: `How to Book IELTS in Nepal ${SEO_YEAR}: Step-by-Step Guide`,
  description:
    "How to book IELTS in Nepal: choose a test type, format, city and date, add your passport details, and see what happens after you book.",
  path: "/ielts-booking-nepal",
});

export default async function IeltsBookingNepalPage() {
  const [cities, booking, general] = await Promise.all([
    fetchCities(),
    fetchFaqs("booking"),
    fetchFaqs("general"),
  ]);
  const faqs = [...booking, ...general.slice(0, 2)];

  return (
    <InfoPage
      path="/ielts-booking-nepal"
      crumb="How to book IELTS"
      eyebrow="Guide"
      title="How to book IELTS in Nepal, step by step"
      lede="IELTS dates in Nepal fill quickly and are released in batches. This guide explains how booking works, what to choose, and how to get a seat without the guesswork."
      faqs={faqs}
      faqTitle="IELTS booking questions"
    >
      <h2>How IELTS booking works in Nepal</h2>
      <p>
        You choose a test <strong>type</strong>, a <strong>format</strong>, a <strong>city</strong>{" "}
        and a <strong>date</strong>. You register with your passport details, pay the test fee, and
        receive your confirmation. Registration closes before the test date, usually about six days
        earlier, so booking early matters.
      </p>
      <p>
        On bookyourielts.com we show the open dates and seats in one place. When you find a date,
        tap <strong>Book this date</strong>, choose your exam preferences and add your details. At
        the very last step we hand you to our team, who confirm your seat and explain payment.
        Nothing is paid on this website.
      </p>

      <h2>Step by step</h2>
      <ol>
        <li>
          Open the <Link href="/ielts-test-dates">IELTS test dates</Link> and filter by city, test
          type, format and month.
        </li>
        <li>Check the fee, seats left and the registration closing date on the date you like.</li>
        <li>Log in or create a free account. We take you straight back to your date.</li>
        <li>Review the summary and confirm. We then hand you to our team to finish.</li>
        <li>
          Our team confirms the seat and explains payment. Keep your passport ready, because the
          name on it must match your booking.
        </li>
      </ol>

      <h2>Choose the right test type</h2>
      <ul>
        <li>
          <strong>IELTS Academic</strong> is for university admission and professional registration.
        </li>
        <li>
          <strong>IELTS General Training</strong> is for work experience, training and migration.
          Not sure which? Read{" "}
          <Link href="/ielts-academic-vs-general-training">Academic vs General Training</Link>.
        </li>
        <li>
          <strong>IELTS UKVI</strong> (Academic or General Training) is for some UK visa and
          immigration applications. Book it only if your visa guidance asks for it.
        </li>
        <li>
          <strong>IELTS Life Skills</strong> tests Speaking and Listening only and is used for some
          UK visa routes.
        </li>
      </ul>

      <h2>Computer or Writing on Paper?</h2>
      <p>
        In Nepal you can take IELTS <strong>on computer</strong>, or{" "}
        <strong>on computer with Writing on Paper</strong>, where you handwrite the Writing test.
        Computer-delivered results usually arrive sooner, in about three to five days. Writing on
        Paper takes longer, usually around thirteen days, is offered at fewer centres and is not
        available for UKVI. Details are in our guide to{" "}
        <Link href="/ielts-on-computer-nepal">IELTS on computer in Nepal</Link>.
      </p>

      <h2>Where you can take IELTS</h2>
      <p>
        {cities && cities.length > 0
          ? `Test dates are held in ${cities.map((c) => c.name).join(", ")}.`
          : "Test dates are held in several cities across Nepal."}{" "}
        Each city has its own schedule:
      </p>
      <ul>
        {(cities ?? []).map((c) => (
          <li key={c.slug}>
            <Link href={`/ielts-test-dates/${c.slug}`}>IELTS test dates in {c.name}</Link>
          </li>
        ))}
      </ul>

      <h2>The Speaking test is on a different slot</h2>
      <p>
        Listening, Reading and Writing are taken one after another on your test date. The Speaking
        test is a short face-to-face conversation with an examiner and is booked as a separate slot,
        normally within about seven days before or after your main test day. Plan for both,
        especially if you are travelling from outside the test city.
      </p>

      <h2>What it costs</h2>
      <p>
        The fee depends on the test type and format, and it can change. Every date on our schedule
        shows its current fee in Nepali rupees. See the{" "}
        <Link href="/ielts-fee-nepal">IELTS fee in Nepal</Link> page for a live overview.
      </p>

      <h2>What to bring on test day</h2>
      <ul>
        <li>The original passport you registered with. No photocopies.</li>
        <li>Your booking confirmation.</li>
        <li>A clear water bottle without a label.</li>
      </ul>
      <p>Phones, bags, watches and notes are kept outside the test room, so travel light.</p>

      <h2>Tips to book without stress</h2>
      <ul>
        <li>
          Book as soon as a suitable date appears. Popular cities and computer sessions fill first.
        </li>
        <li>Check the registration closing date, not just the test date.</li>
        <li>Make sure your name, spelling and passport number are exactly as in your passport.</li>
        <li>
          If you cannot see a date for your city, <Link href="/inquire">send us an inquiry</Link>{" "}
          and we will message you when one opens.
        </li>
      </ul>

      <h2>More guides</h2>
      <ul>
        <li>
          <Link href="/ielts-registration-deadline-nepal">
            IELTS registration deadline in Nepal
          </Link>
        </li>
        <li>
          <Link href="/documents-required-for-ielts-nepal">Documents required for IELTS</Link>
        </li>
        <li>
          <Link href="/ielts-results-date-nepal">IELTS results date in Nepal</Link>
        </li>
        <li>
          <Link href="/ielts-cancellation-refund-nepal">
            IELTS cancellation, transfer and refund
          </Link>
        </li>
        <li>
          <Link href="/ielts-test-centres-nepal">IELTS test centres and cities in Nepal</Link>
        </li>
      </ul>

      <p className="text-muted text-[0.9375rem]">
        bookyourielts.com is an independent booking-assistance service. We are not the British
        Council or IDP. IELTS is jointly owned by the British Council, IDP IELTS and Cambridge
        University Press &amp; Assessment.
      </p>
    </InfoPage>
  );
}
