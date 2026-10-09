import type { BookingStatus } from "@/lib/types";

export const STATUS_UI: Record<BookingStatus, { label: string; chip: string; help: string }> = {
  initiated: {
    label: "Awaiting confirmation",
    chip: "bg-marigold text-ink",
    help: "Our team has your request. Your seat is held only once they confirm it.",
  },
  confirmed: {
    label: "Confirmed",
    chip: "bg-ok text-white",
    help: "Your seat is confirmed. Bring your original passport on test day.",
  },
  cancelled: { label: "Cancelled", chip: "bg-mist text-ink", help: "This request was cancelled." },
};

export function StatusChip({ status }: { status: BookingStatus }) {
  const ui = STATUS_UI[status];
  return (
    <span
      className={`inline-block rounded-sm px-2.5 py-1 font-mono text-xs font-semibold ${ui.chip}`}
    >
      {ui.label}
    </span>
  );
}

export function ProviderMark({ label }: { label: string }) {
  // Text only on purpose: we never use the providers' logos.
  const short = label.startsWith("British") ? "BC" : label.split(" ")[0];
  return (
    <span className="bg-spruce text-board flex h-14 w-14 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold">
      <span aria-hidden>{short}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
