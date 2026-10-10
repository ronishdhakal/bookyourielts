import type { Metadata } from "next";
import { DatesLanding } from "./dates-landing";
import { cleanFilters } from "@/lib/filters";
import { FORMAT_LABELS, formatDate, formatNpr } from "@/lib/format";
import { clampDescription, feeRange, summarize, wordCount } from "@/lib/inventory";
import { isIndexable, landingMetadata, listingPath } from "@/lib/landing-meta";
import { monthsWithSessions, type TypePage } from "@/lib/landing";
import { SEO_YEAR } from "@/lib/seo-config";
import { fetchOpenSessions, fetchSessions } from "@/lib/server-api";

type SP = Record<string, string | string[] | undefined>;

async function load(t: TypePage, sp: SP) {
  const page = cleanFilters(sp).page;
  const [all, listing] = await Promise.all([
    fetchOpenSessions(),
    fetchSessions({ ...t.filters, hide_closed: "true", ...(page ? { page } : {}) }),
  ]);
  const ofType = (all?.results ?? []).filter(
    (s) =>
      (t.filters.test_type ? s.test_type.code === t.filters.test_type : s.test_type.is_ukvi) &&
      (t.match ? t.match(s) : true),
  );
  return { all: all?.results ?? [], ofType, listing };
}

/** Unique, factual paragraphs for a test-type page. Everything is derived from data or the site's own facts. */
function copy(t: TypePage, ofType: ReturnType<typeof summarize>): string[] {
  const parts: string[] = [
    `${t.label} is for ${t.purpose.charAt(0).toLowerCase()}${t.purpose.slice(1)}`,
  ];
  if (ofType.count > 0) {
    const range = feeRange(ofType);
    parts.push(
      `There ${ofType.count === 1 ? "is 1 open date" : `are ${ofType.count} open dates`} for ${t.label} in ${ofType.cityNames.join(", ")} right now, the next on ${formatDate(ofType.next!.date, { weekday: "long" })}. ${range ? `Fees on those dates run ${range}.` : ""} Formats on offer: ${ofType.formats.join(" and ")}.`,
    );
  } else {
    parts.push(
      `There are no open ${t.label} dates right now. New dates are released in batches, so send us an inquiry with your preferred city and month and we will message you when one opens.`,
    );
  }
  parts.push(
    "Listening, Reading and Writing are taken on the date you pick. The Speaking test is a separate slot, usually within about seven days before or after. Registration usually closes about six days before the test date.",
  );
  return parts;
}

export async function typeMetadata(t: TypePage, sp: SP): Promise<Metadata> {
  const { ofType } = await load(t, sp);
  const inv = summarize(ofType);
  const paras = copy(t, inv);
  const base = inv.count
    ? `${inv.count} open ${t.label} ${inv.count === 1 ? "date" : "dates"} in Nepal${inv.cityNames.length ? ` (${inv.cityNames.join(", ")})` : ""}, next on ${formatDate(inv.next!.date)}.${inv.minFee !== null ? ` Fees from ${formatNpr(inv.minFee)}.` : ""} Check seats and book.`
    : `${t.label} dates in Nepal: how it works, fees and deadlines. No open dates right now; ask us and we will message you when one opens.`;
  return landingMetadata({
    title: `${t.label} Dates in Nepal ${SEO_YEAR}: Fees & Seats`,
    description: clampDescription(base),
    path: listingPath(t.path, sp, [
      "city",
      "provider",
      "test_type",
      "test_format",
      "month",
      "category",
    ]),
    indexable: isIndexable(inv.count, wordCount(paras.join(" "))),
  });
}

export async function TypeLandingPage({ t, sp }: { t: TypePage; sp: SP }) {
  const { ofType, listing } = await load(t, sp);
  const inv = summarize(ofType);
  const paras = copy(t, inv);
  const formats = [...new Set(ofType.map((s) => s.format))];
  return (
    <DatesLanding
      path={t.path}
      crumbs={[
        { name: "IELTS test dates", path: "/ielts-test-dates" },
        { name: t.label, path: t.path },
      ]}
      title={`${t.label} test dates in Nepal`}
      lede={`Open ${t.label} dates with fee, seats left and registration deadline.`}
      intro={paras.map((p) => (
        <p key={p}>{p}</p>
      ))}
      data={listing}
      filters={{ page: cleanFilters(sp).page }}
      caption={`${t.label} test dates in Nepal`}
      months={monthsWithSessions(ofType)}
      updatedAt={inv.updatedAt}
      faqs={[
        {
          question: `How much does ${t.label} cost in Nepal?`,
          answer: inv.count
            ? `Open ${t.label} dates currently show ${feeRange(inv)}. The fee is shown on every date and is the one that applies when you book.`
            : `The fee is shown on each date once ${t.label} dates are open. See the IELTS fee page for how fees differ by test type and format.`,
        },
        {
          question: `Which formats are available for ${t.label}?`,
          answer: formats.length
            ? `Right now: ${formats.map((f) => FORMAT_LABELS[f]).join(" and ")}.`
            : `The format is shown on each date when dates are open. UKVI tests, including Life Skills, are not available with Writing on Paper.`,
        },
      ]}
      related={[
        { href: "/ielts-test-dates", text: "All IELTS dates in Nepal" },
        { href: "/ielts-fee-nepal", text: "IELTS fee in Nepal: price by test type" },
        { href: "/ielts-booking-nepal", text: "How to book IELTS in Nepal, step by step" },
        {
          href: "/ielts-academic-vs-general-training",
          text: "IELTS Academic or General Training?",
        },
      ]}
      ctaTitle={`Need a ${t.label} date?`}
    />
  );
}
