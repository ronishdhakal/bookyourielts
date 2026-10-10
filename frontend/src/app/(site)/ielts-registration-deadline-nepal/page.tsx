import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { formatDate } from "@/lib/format";
import { guide } from "@/lib/guides";
import { summarize } from "@/lib/inventory";
import { pageMetadata } from "@/lib/seo";
import { fetchOpenSessions } from "@/lib/server-api";

const g = guide("/ielts-registration-deadline-nepal");

export const metadata = pageMetadata({
  title: g.title,
  description: g.description,
  path: g.path,
});

export default async function Page() {
  const inv = summarize((await fetchOpenSessions())?.results ?? []);
  const next = inv.next;
  return (
    <InfoPage
      path={g.path}
      crumb="IELTS registration deadline"
      eyebrow="Guide"
      title="IELTS registration deadline in Nepal"
      lede="IELTS dates fill and then close for registration. Here is when booking stops and how to find the exact day for the date you want."
      faqs={[
        {
          question: "When does IELTS registration close in Nepal?",
          answer:
            "Registration usually closes about six days before the test date. Each date on our schedule shows its own closing date.",
        },
        {
          question: "Can I book a date after registration has closed?",
          answer:
            "No. Dates whose registration has closed cannot be booked on our website. Send us an inquiry and we will tell you about the next date that matches your needs.",
        },
        {
          question: "Is the Speaking test date also covered by the deadline?",
          answer:
            "Listening, Reading and Writing are on the date you book. The Speaking test is a separate slot, usually within about seven days before or after, and you get its time once your booking is confirmed.",
        },
      ]}
      faqTitle="Registration deadline questions"
    >
      <h2>When registration closes</h2>
      <p>
        For IELTS in Nepal, registration usually closes about <strong>six days before</strong> the
        test date. So a test on a Saturday normally closes for booking on the Sunday of the week
        before. The exact day can differ, so always read the &ldquo;Register by&rdquo; column on the
        date you want rather than counting days yourself.
      </p>
      {next && (
        <p>
          For example, the next open date is {formatDate(next.date, { weekday: "long" })} in{" "}
          {next.city.name}, and registration for it closes on{" "}
          {formatDate(next.registration_closes_on, { weekday: "long" })}.
        </p>
      )}

      <h2>What happens after the deadline</h2>
      <p>
        Once registration has closed, the date shows as &ldquo;Registration closed&rdquo; and the
        Book button is replaced by a link to ask about similar dates. A date can also fill before
        its deadline, in which case it shows as full.
      </p>

      <h2>How to avoid missing it</h2>
      <ul>
        <li>
          Open the <Link href="/ielts-test-dates">IELTS dates in Nepal</Link> and check the
          &ldquo;Register by&rdquo; day, not only the test day.
        </li>
        <li>
          Book as soon as a suitable date appears. Our{" "}
          <Link href="/ielts-booking-nepal">step-by-step booking guide</Link> shows how long each
          step takes.
        </li>
        <li>
          Have the candidate&rsquo;s passport details ready. They must match the passport exactly.
        </li>
        <li>
          If your preferred city has no open date,{" "}
          <Link href="/inquire">tell us what you need</Link> and we will message you when one opens.
        </li>
      </ul>

      <p>
        Also useful: <Link href="/ielts-results-date-nepal">when IELTS results arrive</Link> and{" "}
        <Link href="/ielts-cancellation-refund-nepal">how changes and refunds work</Link>.
      </p>
    </InfoPage>
  );
}
