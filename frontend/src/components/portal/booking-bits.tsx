import { formatDate } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";

export const STATUS_UI: Record<BookingStatus, { label: string; chip: string; help: string }> = {
  initiated: {
    label: "Awaiting confirmation",
    chip: "bg-[#e9ecef] text-ink",
    help: "Our team has your request. Your seat is held only once they confirm it.",
  },
  confirmed: {
    label: "Confirmed",
    chip: "bg-ink text-white",
    help: "Your seat is confirmed. Bring your original passport on test day.",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-white text-muted ring-1 ring-mist ring-inset",
    help: "This request was cancelled.",
  },
};

export function StatusChip({ status }: { status: BookingStatus }) {
  const ui = STATUS_UI[status];
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${ui.chip}`}
    >
      {ui.label}
    </span>
  );
}

/** Whole days from today (Nepal date) to an ISO date. Negative when it has passed. */
export function daysUntil(iso: string): number {
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((d - t) / 86_400_000);
}

export function Countdown({ iso }: { iso: string }) {
  const n = daysUntil(iso);
  if (n < 0) return <span>{Math.abs(n)} days ago</span>;
  if (n === 0) return <span>Today</span>;
  return (
    <span>
      <span className="text-4xl font-bold">{n}</span> {n === 1 ? "day" : "days"} to go
    </span>
  );
}

interface Step {
  label: string;
  detail: string;
  state: "done" | "current" | "todo";
}

export function trackerSteps(b: Booking): Step[] {
  const s = b.session;
  const confirmed = b.status === "confirmed";
  const closed = daysUntil(s.registration_closes_on) < 0;
  const past = daysUntil(s.date) < 0;
  const resultsOut = daysUntil(s.results_date) <= 0;
  return [
    { label: "Request sent", detail: formatDate(b.created_at.slice(0, 10)), state: "done" },
    {
      label: "Confirmed by our team",
      detail: confirmed ? "Seat confirmed" : b.status === "cancelled" ? "Cancelled" : "Waiting",
      state: confirmed ? "done" : b.status === "cancelled" ? "todo" : "current",
    },
    {
      label: "Registration closes",
      detail: formatDate(s.registration_closes_on),
      state: closed ? "done" : confirmed ? "todo" : "todo",
    },
    {
      label: "Test day",
      detail: formatDate(s.date),
      state: past ? "done" : confirmed && closed ? "current" : "todo",
    },
    {
      label: "Results",
      detail: `From ${formatDate(s.results_date)}`,
      state: resultsOut && past ? "done" : "todo",
    },
  ];
}

/** Five-step progress tracker: a row on wide screens, a column on phones. */
export function Tracker({ booking }: { booking: Booking }) {
  const steps = trackerSteps(booking);
  return (
    <ol className="grid gap-0 md:grid-cols-5" aria-label="Booking progress">
      {steps.map((st, i) => (
        <li key={st.label} className="relative flex gap-3 pb-5 last:pb-0 md:block md:pr-3 md:pb-0">
          {i < steps.length - 1 && (
            <>
              <span
                aria-hidden
                className="bg-mist absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5 md:hidden"
              />
              <span
                aria-hidden
                className={`absolute top-[13px] left-9 hidden h-0.5 w-[calc(100%-2.5rem)] md:block ${st.state === "done" ? "bg-ink" : "bg-mist"}`}
              />
            </>
          )}
          <span
            aria-hidden
            className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              st.state === "done"
                ? "bg-ink text-white"
                : st.state === "current"
                  ? "bg-crimson ring-crimson/15 text-white ring-4"
                  : "text-muted border-2 border-[#c4cad2] bg-white"
            }`}
          >
            {st.state === "done" ? "✓" : i + 1}
          </span>
          <span className="md:mt-2 md:block">
            <span
              className={`block text-[0.9375rem] leading-tight ${st.state === "todo" ? "text-muted" : "font-semibold"}`}
            >
              {st.label}
            </span>
            <span className="text-muted block text-[0.8125rem]">{st.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
