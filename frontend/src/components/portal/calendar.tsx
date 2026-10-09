"use client";

import type { TestSession } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/**
 * Month grid showing which days have test dates. Days with at least one bookable session are
 * selectable; days that only have full or closed sessions are marked but not selectable.
 */
export function DateCalendar({
  month,
  sessions,
  selected,
  onSelect,
  onMonthChange,
  minMonth,
  loading,
}: {
  month: string;
  sessions: TestSession[];
  selected: string | null;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
  minMonth: string;
  loading: boolean;
}) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(first);

  const byDate = new Map<string, TestSession[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="panel p-4 md:p-5" aria-busy={loading}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="btn btn-outline btn-sm !min-h-10 !px-3"
          aria-label="Previous month"
          disabled={month <= minMonth}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          ‹
        </button>
        <h3 className="font-display text-xl font-bold" aria-live="polite">
          {label}
        </h3>
        <button
          type="button"
          className="btn btn-outline btn-sm !min-h-10 !px-3"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>

      <div
        role="grid"
        aria-label={`Test dates in ${label}`}
        className={`grid grid-cols-7 gap-1 ${loading ? "opacity-60" : ""}`}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            role="columnheader"
            className="text-muted py-1 text-center font-mono text-xs"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} role="gridcell" aria-hidden />;
          const date = `${month}-${pad(day)}`;
          const list = byDate.get(date) ?? [];
          const open = list.filter((s) => s.is_bookable);
          const isSel = selected === date;
          const state = open.length ? "open" : list.length ? "full" : "none";
          return (
            <div key={date} role="gridcell" className="aspect-square min-h-11">
              <button
                type="button"
                disabled={state !== "open"}
                aria-pressed={isSel}
                aria-label={`${day} ${label}${
                  state === "open"
                    ? `, ${open.length} ${open.length === 1 ? "session" : "sessions"} available`
                    : state === "full"
                      ? ", no seats available"
                      : ", no test"
                }`}
                onClick={() => onSelect(date)}
                className={`relative flex h-full w-full flex-col items-center justify-center rounded-md font-mono text-sm transition-colors ${
                  isSel
                    ? "bg-crimson font-bold text-white"
                    : state === "open"
                      ? "bg-spruce text-board hover:bg-spruce-2 font-semibold"
                      : state === "full"
                        ? "text-muted bg-mist/60 line-through"
                        : "text-ink/35"
                }`}
              >
                {day}
                {state === "open" && !isSel && (
                  <span
                    aria-hidden
                    className="bg-marigold absolute bottom-1 h-1 w-1 rounded-full"
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <ul
        className="text-muted mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem]"
        aria-label="Legend"
      >
        <li className="flex items-center gap-2">
          <span aria-hidden className="bg-spruce inline-block h-3 w-3 rounded-sm" /> Seats available
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="bg-mist inline-block h-3 w-3 rounded-sm" /> Full or closed
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="bg-crimson inline-block h-3 w-3 rounded-sm" /> Your choice
        </li>
      </ul>
    </div>
  );
}
