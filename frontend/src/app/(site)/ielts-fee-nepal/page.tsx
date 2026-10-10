import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { FORMAT_LABELS, formatNpr } from "@/lib/format";
import { clampDescription, feeRange, summarize, updatedLabel } from "@/lib/inventory";
import { JsonLd } from "@/components/json-ld";
import { REFUND_AND_FEES } from "@/lib/policy";
import { pageMetadata, webPageLd } from "@/lib/seo";
import { SEO_YEAR } from "@/lib/seo-config";
import { fetchFaqs, fetchOpenSessions, fetchTestTypes } from "@/lib/server-api";
import type { TestFormat } from "@/lib/types";

// Rendered per request (data is cached by the fetch layer). Prerendering at build would bake in
// an empty page, because the API is not reachable while the Docker image is built.
export const dynamic = "force-dynamic";

const FORMATS: TestFormat[] = ["computer", "computer_wop"];

export async function generateMetadata(): Promise<Metadata> {
  const inv = summarize((await fetchOpenSessions())?.results ?? []);
  const range = feeRange(inv);
  return pageMetadata({
    title: `IELTS Fee in Nepal ${SEO_YEAR} (NPR): Price by Test Type`,
    description: clampDescription(
      range
        ? `IELTS price in Nepal ${SEO_YEAR}: fees run ${range} depending on test type and format. See Academic, General Training, UKVI and Life Skills, and why fees differ.`
        : `IELTS fee in Nepal ${SEO_YEAR}: what affects the price of Academic, General Training, UKVI and Life Skills, how payment works, and how to ask for the current fee.`,
    ),
    path: "/ielts-fee-nepal",
  });
}

export default async function FeePage() {
  const [data, types, faqs] = await Promise.all([
    fetchOpenSessions(),
    fetchTestTypes(),
    fetchFaqs("fees"),
  ]);
  const sessions = data?.results ?? [];
  const inv = summarize(sessions);
  const range = feeRange(inv);
  const verified = updatedLabel(inv.updatedAt);

  // One row per test type x format. Fees come from the open dates; no date means "Ask us", never a guess.
  const rows = (types ?? []).flatMap((t) =>
    FORMATS.map((format) => {
      const match = sessions.filter((s) => s.test_type.code === t.code && s.format === format);
      const fees = match.map((s) => s.fee_npr);
      return {
        key: `${t.code}|${format}`,
        type: t.name,
        format,
        notOffered: t.is_ukvi && format === "computer_wop",
        min: fees.length ? Math.min(...fees) : null,
        max: fees.length ? Math.max(...fees) : null,
        count: match.length,
      };
    }),
  );

  const serviceAnswer = REFUND_AND_FEES.service;

  const pageFaqs = [
    {
      question: `How much does IELTS cost in Nepal in ${SEO_YEAR}?`,
      answer: range
        ? `On the dates we list right now, the IELTS cost in Nepal runs ${range}, depending on the test type and format. The fee for each date is shown on the date itself.`
        : "The IELTS cost in Nepal depends on the test type and format. No dates are open at the moment, so there is no fee to show; send an inquiry and we will tell you the current fee.",
    },
    {
      question: "Is the UKVI fee different?",
      answer:
        "UKVI tests (UKVI Academic, UKVI General Training and Life Skills) are priced separately from the standard Academic and General Training tests. The fee is shown on each UKVI date.",
    },
    {
      question: "Is the IELTS fee refundable?",
      answer: REFUND_AND_FEES.refund,
    },
    {
      question: "Why do two dates show different fees?",
      answer:
        "The fee depends on the test type (for example Academic or UKVI) and the format (computer-delivered or Writing on Paper). The fee set for a date can also change over time. The fee shown on the date you book is the one that applies.",
    },
    {
      question: "Is there a service charge?",
      answer: serviceAnswer,
    },
    ...faqs.filter((f) => !/how much|service charge|refund/i.test(f.question)),
  ];

  return (
    <InfoPage
      path="/ielts-fee-nepal"
      crumb="IELTS fee in Nepal"
      eyebrow="Fees"
      title={`IELTS fee in Nepal ${SEO_YEAR}: how much does IELTS cost?`}
      lede="The IELTS price in Nepal depends on the test type and the format. This page shows the current fee for each, taken from the dates we list."
      faqs={pageFaqs}
      faqTitle="Fee and refund questions"
    >
      <p>
        {range ? (
          <>
            The IELTS cost in Nepal is currently <strong>{range}</strong> on the dates we list,
            depending on the test. The IELTS exam fee for each date is in Nepali rupees (NPR) and is
            shown before you book. Looking for a date instead? See the{" "}
            <Link href="/ielts-test-dates">IELTS dates in Nepal</Link>.
          </>
        ) : (
          <>
            No dates are open at the moment, so there is no current IELTS price to show. Fees appear
            here as soon as dates are added. <Link href="/inquire">Send an inquiry</Link> and we
            will message you.
          </>
        )}
      </p>

      <h2>IELTS fee in Nepal by test type</h2>
      <table>
        <caption className="sr-only">IELTS fees in Nepali rupees by test type and format</caption>
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
            <tr key={r.key}>
              <td>{r.type}</td>
              <td>{FORMAT_LABELS[r.format]}</td>
              <td className="font-mono whitespace-nowrap">
                {r.notOffered
                  ? "Not offered"
                  : r.min === null || r.max === null
                    ? "Ask us"
                    : r.min === r.max
                      ? formatNpr(r.min)
                      : `${formatNpr(r.min)} – ${formatNpr(r.max)}`}
              </td>
              <td>{r.notOffered ? "–" : r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {verified && <>Fees last verified {verified}. </>}
        &ldquo;Ask us&rdquo; means no date is open for that test right now, so we do not show a fee.{" "}
        <Link href="/inquire">Ask us for the current fee</Link>. Fees are set by the test provider
        and can change.
      </p>

      <h2>Why fees differ</h2>
      <ul>
        <li>
          <strong>UKVI tests</strong> (UKVI Academic, UKVI General Training and Life Skills) are
          priced separately from the standard Academic and General Training tests, and are not
          available with Writing on Paper.
        </li>
        <li>
          <strong>Writing on Paper</strong> is a different format from the standard
          computer-delivered test and may be priced differently. See{" "}
          <Link href="/ielts-on-computer-nepal">IELTS on computer in Nepal</Link>.
        </li>
        <li>Academic and General Training are normally priced the same within the same format.</li>
      </ul>

      <h2>How you pay</h2>
      <p>
        There is no online payment on bookyourielts.com. Once you confirm your booking request, our
        team explains the payment steps and tells you exactly what is included before you pay
        anything.
      </p>

      <h2>Our service charge</h2>
      <p>{serviceAnswer}</p>

      <h2>Refunds</h2>
      <p>{REFUND_AND_FEES.refund}</p>

      <h2>Official information</h2>
      <p>
        IELTS is jointly owned by the British Council, IDP IELTS and Cambridge University Press
        &amp; Assessment. For the official description of the test, visit{" "}
        <a href="https://ielts.org" rel="noopener noreferrer" target="_blank">
          ielts.org
        </a>
        . bookyourielts.com is an independent service and is not affiliated with them.
      </p>

      <p>
        Ready to book? Browse <Link href="/ielts-test-dates">all IELTS test dates</Link> or read{" "}
        <Link href="/ielts-booking-nepal">how to book IELTS in Nepal</Link>.
      </p>
      <JsonLd
        data={webPageLd({
          path: "/ielts-fee-nepal",
          name: "IELTS fee in Nepal",
          dateModified: inv.updatedAt,
        })}
      />
    </InfoPage>
  );
}
