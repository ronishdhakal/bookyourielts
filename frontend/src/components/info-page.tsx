import { CtaBand } from "./cta-band";
import { FaqList } from "./faq-list";
import { PageHeader } from "./page-header";
import type { Faq } from "@/lib/types";

/** Shared layout for long-form informational pages. */
export function InfoPage({
  path,
  crumb,
  title,
  lede,
  eyebrow,
  children,
  faqs,
  faqTitle = "Frequently asked questions",
  cta = true,
  after,
}: {
  path: string;
  crumb: string;
  title: string;
  lede?: string;
  eyebrow?: string;
  children: React.ReactNode;
  faqs?: Pick<Faq, "question" | "answer">[];
  faqTitle?: string;
  cta?: boolean;
  after?: React.ReactNode;
}) {
  return (
    <>
      <PageHeader crumbs={[{ name: crumb, path }]} title={title} lede={lede} eyebrow={eyebrow} />
      <div className="container-page">
        <div className="prose-page">{children}</div>
        {after}
        {faqs && faqs.length > 0 && (
          <section className="mt-16 max-w-3xl" aria-labelledby="faq">
            <h2 id="faq" className="mb-4 text-3xl font-bold">
              {faqTitle}
            </h2>
            <FaqList faqs={faqs} />
          </section>
        )}
      </div>
      {cta && <CtaBand />}
    </>
  );
}
