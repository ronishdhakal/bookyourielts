import Image from "next/image";

const LOGOS = {
  british_council: "/static/british-ielts.png",
  idp: "/static/idp-ielts.png",
} as const;

/** The exam provider's mark (250x158 source). The label is the accessible name. */
export function ProviderLogo({
  provider,
  label,
  height = 28,
  className = "",
}: {
  provider: string;
  label: string;
  height?: number;
  className?: string;
}) {
  const src = LOGOS[provider as keyof typeof LOGOS];
  if (!src) return null;
  const width = Math.round((height * 250) / 158);
  return (
    <Image
      src={src}
      alt={`${label} IELTS`}
      width={width}
      height={height}
      style={{ height, width: "auto" }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
