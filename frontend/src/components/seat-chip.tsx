import { STATUS_COPY } from "@/lib/format";
import type { SeatStatus } from "@/lib/types";

const DARK: Record<SeatStatus, string> = {
  available: "bg-ok-light/15 text-ok-light ring-ok-light/50",
  few_left: "bg-marigold text-ink ring-marigold",
  full: "bg-white/10 text-board ring-white/40",
  closed: "bg-transparent text-board/80 ring-white/30",
};

const LIGHT: Record<SeatStatus, string> = {
  available: "bg-ok/10 text-ok ring-ok/40",
  few_left: "bg-marigold text-ink ring-marigold",
  full: "bg-mist text-ink ring-mist",
  closed: "bg-transparent text-muted ring-mist",
};

/** Seat status chip. Colour is never the only signal: glyph + label always show. */
export function SeatChip({
  status,
  label,
  tone = "dark",
}: {
  status: SeatStatus;
  label?: string;
  tone?: "dark" | "light";
}) {
  const copy = STATUS_COPY[status];
  const styles = tone === "dark" ? DARK : LIGHT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[0.75rem] leading-none font-medium whitespace-nowrap ring-1 ring-inset ${styles[status]}`}
    >
      <span aria-hidden>{copy.glyph}</span>
      {label ?? copy.label}
    </span>
  );
}
