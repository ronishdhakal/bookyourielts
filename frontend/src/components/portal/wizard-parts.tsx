"use client";

import { FORMAT_LABELS, SLOT_TIMES, formatDate, formatNpr } from "@/lib/format";
import type { TestSession } from "@/lib/types";

export const STEPS = [
  { key: "provider", title: "Exam provider", hint: "Who runs the test" },
  { key: "prefs", title: "Exam preferences", hint: "Type, format and city" },
  { key: "date", title: "Test date", hint: "Pick from open dates" },
  { key: "details", title: "Your details", hint: "Candidate and address" },
  { key: "review", title: "Review and confirm", hint: "Check everything" },
] as const;

/** Vertical rail on desktop, compact progress bar on phones. */
export function Stepper({
  current,
  furthest,
  onGo,
}: {
  current: number;
  furthest: number;
  onGo: (i: number) => void;
}) {
  return (
    <>
      <ol className="hidden lg:block" aria-label="Booking steps">
        {STEPS.map((s, i) => {
          const done = i < current || i < furthest;
          const isCurrent = i === current;
          const reachable = i <= furthest && !isCurrent;
          return (
            <li key={s.key} className="relative pb-7 pl-11 last:pb-0">
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 ${done && i < furthest ? "bg-spruce" : "bg-mist"}`}
                />
              )}
              <span
                aria-hidden
                className={`absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold ${
                  isCurrent
                    ? "bg-crimson text-white"
                    : done
                      ? "bg-spruce text-board"
                      : "border-mist text-muted border-2"
                }`}
              >
                {done && !isCurrent ? "✓" : i + 1}
              </span>
              <button
                type="button"
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onGo(i)}
                className="text-left disabled:cursor-default"
              >
                <span
                  className={`block leading-tight font-semibold ${isCurrent ? "text-ink" : "text-ink/80"}`}
                >
                  {s.title}
                </span>
                <span className="text-muted block text-[0.8125rem]">{s.hint}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="lg:hidden" role="group" aria-label={`Step ${current + 1} of ${STEPS.length}`}>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg font-bold">{STEPS[current]?.title}</p>
          <p className="text-muted font-mono text-xs">
            Step {current + 1} of {STEPS.length}
          </p>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 flex-1 rounded-full ${i <= current ? "bg-crimson" : "bg-mist"}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export interface SummaryData {
  providerLabel?: string;
  typeName?: string;
  category?: string;
  format?: keyof typeof FORMAT_LABELS | "";
  cityName?: string;
  session?: TestSession | null;
  candidate?: string;
}

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[0.9375rem]">
      <dt className="text-board/70 shrink-0">{k}</dt>
      <dd className={`text-right font-medium ${v ? "" : "text-board/40"}`}>
        {v || "Not chosen yet"}
      </dd>
    </div>
  );
}

/** Live booking summary shaped like a ticket stub, with the fee on the tear-off part. */
export function SummaryTicket({ data }: { data: SummaryData }) {
  const s = data.session;
  return (
    <div className="ticket on-dark" style={{ ["--tear" as string]: "66%" }}>
      <div className="p-5 pb-6">
        <p className="text-board/70 font-mono text-[0.75rem] tracking-wide">YOUR BOOKING</p>
        <p className="font-display mt-1 text-2xl leading-tight font-bold">
          {data.typeName ?? "IELTS"}
        </p>
        <dl className="mt-3 divide-y divide-white/10">
          <Row k="Provider" v={data.providerLabel} />
          <Row k="Category" v={data.category} />
          <Row k="Format" v={data.format ? FORMAT_LABELS[data.format] : undefined} />
          <Row k="City" v={data.cityName} />
          <Row k="Date" v={s ? formatDate(s.date, { weekday: "short" }) : undefined} />
          <Row
            k="Session"
            v={
              s
                ? `${s.slot === "morning" ? "Morning" : "Afternoon"} · ${SLOT_TIMES[s.slot]}`
                : undefined
            }
          />
          {data.candidate && <Row k="Candidate" v={data.candidate} />}
        </dl>
      </div>
      <div className="ticket-tear" />
      <div className="p-5 pt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-board/70 font-mono text-[0.75rem] tracking-wide">TEST FEE</p>
            <p className="font-mono text-3xl font-semibold">
              {s ? formatNpr(s.fee_npr) : "NPR --"}
            </p>
          </div>
          {s && (
            <p className="text-board/70 text-right font-mono text-[0.75rem]">
              Register by
              <br />
              <span className="text-board">
                {formatDate(s.registration_closes_on, { year: undefined })}
              </span>
            </p>
          )}
        </div>
        {s && (
          <p className="text-board/70 mt-3 text-[0.8125rem]">
            Results from {formatDate(s.results_date, { year: undefined })}. Speaking is a separate
            slot within about a week of the test day.
          </p>
        )}
      </div>
    </div>
  );
}
