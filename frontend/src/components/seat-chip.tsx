import { STATUS_COPY } from "@/lib/format";
import type { SeatStatus } from "@/lib/types";

const STYLES: Record<SeatStatus, string> = {
  available: "bg-ok-light/15 text-ok-light ring-ok-light/50",
  few_left: "bg-marigold text-ink ring-marigold",
  full: "bg-white/10 text-board ring-white/40",
  closed: "bg-transparent text-board/80 ring-white/30",
};

/** Seat status chip for the dark board. Colour is never the only signal: glyph + label always show. */
export function SeatChip({ status, label }: { status: SeatStatus; label?: string }) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[0.75rem] leading-none font-medium whitespace-nowrap ring-1 ring-inset ${STYLES[status]}`}
    >
      <span aria-hidden>{copy.glyph}</span>
      {label ?? copy.label}
    </span>
  );
}
