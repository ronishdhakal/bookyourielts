import { STATUS_COPY } from "@/lib/format";
import type { SeatStatus } from "@/lib/types";

/** Brand palette only: neutral for open, red for urgent, grey for unavailable. */
const STYLES: Record<SeatStatus, string> = {
  available: "bg-white text-ink ring-[#aab1bb]",
  few_left: "bg-crimson-tint text-crimson-dark ring-crimson/40",
  full: "bg-[#e9ecef] text-muted ring-[#e9ecef]",
  closed: "bg-transparent text-muted ring-mist",
};

/** Seat status chip. Colour is never the only signal: the shape and the label always show. */
export function SeatChip({
  status,
  label,
}: {
  status: SeatStatus;
  label?: string;
  tone?: "dark" | "light";
}) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs leading-none font-semibold whitespace-nowrap ring-1 ring-inset ${STYLES[status]}`}
    >
      <span aria-hidden>{copy.glyph}</span>
      {label ?? copy.label}
    </span>
  );
}
