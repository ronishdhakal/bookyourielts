import { faqLd } from "@/lib/seo";
import type { Faq } from "@/lib/types";
import { JsonLd } from "./json-ld";

export function FaqList({
  faqs,
  withSchema = true,
}: {
  faqs: Pick<Faq, "question" | "answer">[];
  withSchema?: boolean;
}) {
  if (faqs.length === 0) return null;
  return (
    <div>
      <div className="border-mist divide-mist divide-y border-y">
        {faqs.map((f) => (
          <details key={f.question} className="group py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {f.question}
              <span
                aria-hidden
                className="text-crimson shrink-0 text-2xl leading-none transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="text-muted max-w-2xl space-y-3 pb-4 text-[1.0625rem]">
              {f.answer.split(/\n{2,}/).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
      {withSchema && <JsonLd data={faqLd(faqs)} />}
    </div>
  );
}
