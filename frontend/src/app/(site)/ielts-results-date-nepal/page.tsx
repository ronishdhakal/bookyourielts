import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { formatDate } from "@/lib/format";
import { guide } from "@/lib/guides";
import { summarize } from "@/lib/inventory";
import { pageMetadata } from "@/lib/seo";
import { fetchOpenSessions } from "@/lib/server-api";

const g = guide("/ielts-results-date-nepal");

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
      crumb="IELTS results date"
      eyebrow="Guide"
      title="IELTS results date in Nepal"
      lede="How long you wait for IELTS results depends on the format you book. Each date on our schedule shows its results date."
      faqs={[
        {
          question: "How soon are IELTS results ready in Nepal?",
          answer:
            "Computer-delivered results are usually ready in about three to five days. Writing on Paper takes longer, usually around thirteen days.",
        },
        {
          question: "Where can I see the results date for my test?",
          answer:
            'Every date on our schedule has a "Results from" day next to the registration deadline.',
        },
        {
          question: "Which format gives the faster result?",
          answer:
            "Computer-delivered results usually take about three to five days and Writing on Paper around thirteen. If you need results quickly, book the computer-delivered format.",
        },
      ]}
      faqTitle="IELTS results questions"
    >
      <h2>Computer or Writing on Paper</h2>
      <p>
        <strong>Computer-delivered IELTS</strong> results are usually ready in about three to five
        days after the test; on our schedule the results date is shown as five days after the test
        day. <strong>Computer-delivered with Writing on Paper</strong> takes longer, around thirteen
        days. UKVI tests, including Life Skills, are not available with Writing on Paper.
      </p>
      {next && (
        <p>
          For example, the next open date is {formatDate(next.date, { weekday: "long" })} (
          {next.format_label}), with results from {formatDate(next.results_date)}.
        </p>
      )}

      <h2>The Speaking test</h2>
      <p>
        Listening, Reading and Writing are taken on your test date. The Speaking test is a separate
        slot, usually within about seven days before or after. Your results are for the whole test,
        so the Speaking slot is part of the timeline.
      </p>

      <h2>Planning around the results date</h2>
      <ul>
        <li>
          If a university or visa deadline is close, choose the computer-delivered format and check
          the &ldquo;Results from&rdquo; day on the{" "}
          <Link href="/ielts-test-dates">IELTS dates in Nepal</Link>.
        </li>
        <li>
          Read how <Link href="/ielts-on-computer-nepal">IELTS on computer</Link> differs from
          Writing on Paper.
        </li>
        <li>
          Remember the <Link href="/ielts-registration-deadline-nepal">registration deadline</Link>{" "}
          comes about six days before the test.
        </li>
      </ul>
    </InfoPage>
  );
}
