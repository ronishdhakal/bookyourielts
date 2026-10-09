"use client";

import { useState } from "react";
import { catalogApi, inquiryApi } from "@/lib/api";
import { FORMAT_LABELS, formatDate, monthLabel } from "@/lib/format";
import type { Inquiry } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { InquiryForm } from "../inquiry-form";

const STATUS: Record<Inquiry["status"], { label: string; cls: string }> = {
  new: { label: "Received", cls: "bg-[#e9ecef] text-ink" },
  contacted: { label: "We have contacted you", cls: "bg-ink text-white" },
  closed: { label: "Closed", cls: "bg-white text-muted ring-1 ring-mist ring-inset" },
};

/** Ask the team a question or request a date, and follow every inquiry you have sent. */
export function Help() {
  const [tab, setTab] = useState<"question" | "date">("question");
  const mine = useLoader("my-inquiries", () => inquiryApi.mine());
  const cities = useLoader("cities", () => catalogApi.cities());
  const types = useLoader("types", () => catalogApi.testTypes());

  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Help</h1>
      <p className="text-muted mt-1 mb-6 max-w-2xl">
        Ask our team a question, or tell us about a date you need that is not listed. We reply in
        English or Nepali.
      </p>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="panel panel-pad" aria-label="Send an inquiry">
          <div
            role="tablist"
            aria-label="Type of inquiry"
            className="border-mist mb-6 inline-flex overflow-hidden rounded-lg border"
          >
            {(
              [
                ["question", "Ask a question"],
                ["date", "Request a date"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={tab === v}
                type="button"
                onClick={() => setTab(v)}
                className={`min-h-10 px-5 text-[0.9375rem] font-semibold ${tab === v ? "bg-ink text-white" : "hover:bg-black/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "question" ? (
            <InquiryForm key="q" variant="general" idPrefix="help-q" onSent={mine.reload} />
          ) : (
            <InquiryForm
              key="d"
              variant="dates"
              idPrefix="help-d"
              cities={cities.data ?? []}
              types={types.data ?? []}
              onSent={mine.reload}
            />
          )}
        </section>

        <section className="panel panel-pad !p-5" aria-labelledby="mine-h">
          <h2 id="mine-h" className="text-lg font-bold">
            Your inquiries
          </h2>
          {mine.loading ? (
            <div
              className="skeleton-light mt-3 h-20 rounded-lg"
              role="status"
              aria-label="Loading"
            />
          ) : (mine.data ?? []).length === 0 ? (
            <p className="text-muted mt-2 text-[0.9375rem]">
              Nothing sent yet. Your inquiries and our replies will be tracked here.
            </p>
          ) : (
            <ul className="divide-mist mt-2 divide-y">
              {(mine.data ?? []).map((i) => {
                const wants = [
                  i.test_type,
                  i.preferred_city,
                  i.format && FORMAT_LABELS[i.format],
                  i.preferred_month && monthLabel(i.preferred_month),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={i.id} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{wants ? "Date request" : "Question"}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS[i.status].cls}`}
                      >
                        {STATUS[i.status].label}
                      </span>
                    </div>
                    {wants && <p className="text-muted text-[0.875rem]">{wants}</p>}
                    {i.message && <p className="mt-1 line-clamp-2 text-[0.9375rem]">{i.message}</p>}
                    <p className="text-muted mt-1 text-[0.8125rem]">
                      Sent {formatDate(i.created_at.slice(0, 10))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
