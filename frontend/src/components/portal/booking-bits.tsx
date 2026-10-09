import type { BookingStatus } from "@/lib/types";

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
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${ui.chip}`}>
      {ui.label}
    </span>
  );
}

export function ProviderMark({ label }: { label: string }) {
  // Text only on purpose: we never use the providers' logos.
  const short = label.startsWith("British") ? "BC" : label.split(" ")[0];
  return (
    <span className="border-mist text-crimson flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border text-sm font-extrabold">
      <span aria-hidden>{short}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
