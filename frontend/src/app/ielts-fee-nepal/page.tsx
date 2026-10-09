import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { FORMAT_LABELS, formatNpr } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { fetchContent, fetchFaqs, fetchSessions } from "@/lib/server-api";
import type { TestFormat } from "@/lib/types";

export const metadata = pageMetadata({
  title: "IELTS Exam Fee in Nepal: Current Fees by Test Type",
  description:
    "What does IELTS cost in Nepal? See current IELTS fees in NPR by test type and format (Academic, General Training, UKVI, Life Skills), plus what affects the price.",
  path: "/ielts-fee-nepal",
});

export const revalidate = 300;

export default async function FeePage() {
  const [data, faqs, blocks] = await Promise.all([
    fetchSessions({ hide_closed: "true", page_size: "100" }, 300),
    fetchFaqs("fees"),
    fetchContent(),
  ]);

  const groups = new Map<
    string,
    { type: string; format: TestFormat; min: number; max: number; count: number }
  >();
  for (const s of data?.results ?? []) {
    const key = `${s.test_type.code}|${s.format}`;
    const g = groups.get(key);
    if (g) {
      g.min = Math.min(g.min, s.fee_npr);
      g.max = Math.max(g.max, s.fee_npr);
      g.count += 1;
    } else
      groups.set(key, {
        type: s.test_type.name,
        format: s.format,
        min: s.fee_npr,
        max: s.fee_npr,
        count: 1,
      });
  }
  const rows = [...groups.values()].sort(
    (a, b) => a.type.localeCompare(b.type) || a.format.localeCompare(b.format),
  );
  const refund = blocks.find((b) => b.key === "cancellation-refund");

  return (
    <InfoPage
      path="/ielts-fee-nepal"
      crumb="IELTS fee in Nepal"
      eyebrow="Fees"
      title="IELTS exam fee in Nepal"
      lede="The fee depends on the test type and format. Here are the fees on our schedule right now, taken live from the dates we list."
      faqs={faqs}
      faqTitle="Fee and refund questions"
    >
      <h2>Current IELTS fees on our schedule</h2>
      {rows.length > 0 ? (
        <table>
          <caption className="sr-only">Current IELTS fees in Nepali rupees</caption>
          <thead>
            <tr>
              <th scope="col">Test</th>
              <th scope="col">Format</th>
              <th scope="col">Fee</th>
              <th scope="col">Open dates</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type + r.format}>
                <td>{r.type}</td>
                <td>{FORMAT_LABELS[r.format]}</td>
                <td className="font-mono whitespace-nowrap">
                  {r.min === r.max ? formatNpr(r.min) : `${formatNpr(r.min)} – ${formatNpr(r.max)}`}
                </td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          No dates are open at the moment, so there are no fees to show. Fees appear here as soon as
          dates are added. <Link href="/inquire">Send an inquiry</Link> and we will message you.
        </p>
      )}
      <p>
        Fees are set by the test provider and can change. The fee shown on the date you book is the
        one that applies.
      </p>

      <h2>Why fees differ</h2>
      <ul>
        <li>
          <strong>UKVI tests</strong> (UKVI Academic, UKVI General Training and Life Skills) are
          priced separately from the standard Academic and General Training tests.
        </li>
        <li>
          <strong>Writing on Paper</strong> is a different format from the standard
          computer-delivered test and may be priced differently.
        </li>
        <li>Academic and General Training are normally priced the same within the same format.</li>
      </ul>

      <h2>How you pay</h2>
      <p>
        There is no online payment on bookyourielts.com. After you tap Book via WhatsApp, our team
        explains the payment steps in the chat and tells you exactly what is included before you pay
        anything.
      </p>

      {refund && (
        <>
          <h2>{refund.title}</h2>
          {refund.body.split(/\n{2,}/).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </>
      )}

      <p>
        Ready to see dates? Browse <Link href="/ielts-test-dates">all IELTS test dates</Link>.
      </p>
    </InfoPage>
  );
}
