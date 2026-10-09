"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/**
 * Date field with a calendar pop-up. Days that have open sessions are bold and underlined;
 * every other day is greyed out and cannot be chosen.
 */
export function DatePicker({
  id,
  value,
  onChange,
  month,
  onMonthChange,
  available,
  minMonth,
  loading,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (date: string) => void;
  month: string;
  onMonthChange: (m: string) => void;
  /** Dates (YYYY-MM-DD) in the shown month that have seats. */
  available: Set<string>;
  minMonth: string;
  loading: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(first);
  const cells: (number | null)[] = [
    ...Array(first.getUTCDay()).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div ref={box} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
        className={`field-input flex items-center justify-between text-left ${invalid ? "border-crimson" : ""}`}
      >
        <span className={value ? "" : "text-[#8a929d]"}>
          {value ? formatDate(value, { weekday: "short" }) : "Select a date"}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="text-muted"
        >
          <path d="M5 5h14v15H5zM5 10h14M9 3v4M15 3v4" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a test date"
          className="border-mist absolute z-20 mt-2 w-[19.5rem] max-w-[calc(100vw-2rem)] rounded-lg border bg-white p-4 shadow-xl"
          aria-busy={loading}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded hover:bg-black/5 disabled:opacity-30"
              aria-label="Previous month"
              disabled={month <= minMonth}
              onClick={() => onMonthChange(shiftMonth(month, -1))}
            >
              ‹
            </button>
            <p className="font-semibold" aria-live="polite">
              {label}
            </p>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded hover:bg-black/5"
              aria-label="Next month"
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              ›
            </button>
          </div>
          <div
            role="grid"
            aria-label={label}
            className={`grid grid-cols-7 gap-y-1 text-center text-sm ${loading ? "opacity-50" : ""}`}
          >
            {WEEKDAYS.map((w) => (
              <div key={w} role="columnheader" className="text-muted py-1 text-xs">
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`b${i}`} role="gridcell" />;
              const date = `${month}-${pad(day)}`;
              const ok = available.has(date);
              const sel = value === date;
              return (
                <div key={date} role="gridcell" className="flex justify-center">
                  <button
                    type="button"
                    disabled={!ok}
                    aria-pressed={sel}
                    aria-label={`${day} ${label}${ok ? ", available" : ", not available"}`}
                    onClick={() => {
                      onChange(date);
                      setOpen(false);
                    }}
                    className={`h-9 w-9 rounded-full ${
                      sel
                        ? "bg-crimson font-bold text-white"
                        : ok
                          ? "text-ink hover:bg-crimson-tint font-bold underline underline-offset-4"
                          : "text-[#aab1bb]"
                    }`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-muted mt-3 text-xs">Underlined days have seats available.</p>
        </div>
      )}
    </div>
  );
}
