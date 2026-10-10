import Link from "next/link";
import { CtaBand } from "./cta-band";
import { JsonLd } from "./json-ld";
import { FaqList } from "./faq-list";
import { PageHeader } from "./page-header";
import { ScheduleResults, SpeakingExplainer } from "./schedule-results";
import { monthLabel } from "@/lib/format";
import { updatedLabel } from "@/lib/inventory";
import { monthSlug } from "@/lib/landing";
import { webPageLd } from "@/lib/seo";
import type { Faq, Page, SessionFilters, TestSession } from "@/lib/types";

export interface RelatedLink {
  href: string;
  text: string;
}

/**
 * Shared layout for the date landing pages (test type, month, provider). Each page passes its own
 * intro copy, so every landing page has unique text above a live table.
 */
export function DatesLanding({
  path,
  crumbs,
  title,
  lede,
  intro,
  data,
  filters,
  caption,
  months,
  updatedAt,
  faqs,
  related,
  ctaTitle,
}: {
  path: string;
  crumbs: { name: string; path: string }[];
  title: string;
  lede: string;
  intro: React.ReactNode;
  data: Page<TestSession> | null;
  filters: SessionFilters;
  caption: string;
  /** Months (YYYY-MM) that have open dates, for the quick links. */
  months: string[];
  updatedAt: string | null;
  faqs: Pick<Faq, "question" | "answer">[];
  related: RelatedLink[];
  ctaTitle?: string;
}) {
  const updated = updatedLabel(updatedAt);
  return (
    <>
      <PageHeader crumbs={crumbs} title={title} lede={lede} />
      <div className="container-page">
        <div className="prose-page">{intro}</div>
        {updated && <p className="text-muted mt-4 text-sm">Last updated {updated}</p>}
        {months.length > 0 && (
          <nav aria-label="IELTS dates by month" className="mt-5 flex flex-wrap gap-2">
            {months.map((m) => (
              <Link
                key={m}
                href={`/ielts-test-dates/${monthSlug(m)}`}
                className="btn btn-outline btn-sm"
              >
                IELTS dates in {monthLabel(m)}
              </Link>
            ))}
          </nav>
        )}
        <div className="mt-6" style={{ minHeight: 320 }}>
          <ScheduleResults data={data} filters={filters} basePath={path} caption={caption} />
        </div>
        <div className="mt-8 max-w-3xl">
          <SpeakingExplainer />
        </div>
        <section className="prose-page mt-12" aria-labelledby="related">
          <h2 id="related" className="!mt-0">
            More about IELTS in Nepal
          </h2>
          <ul>
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>{r.text}</Link>
              </li>
            ))}
          </ul>
        </section>
        {faqs.length > 0 && (
          <section className="mt-12 max-w-3xl" aria-labelledby="landing-faq">
            <h2 id="landing-faq" className="mb-4 text-3xl font-bold">
              Common questions
            </h2>
            <FaqList faqs={faqs} />
          </section>
        )}
      </div>
      <CtaBand title={ctaTitle} />
      <JsonLd data={webPageLd({ path, name: title, dateModified: updatedAt })} />
    </>
  );
}
