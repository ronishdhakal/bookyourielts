import Image from "next/image";

/**
 * The brand logo (public/static/logo.png, 1272x457). Its lettering is dark, so on dark
 * backgrounds it sits on a light plate (`onDark`).
 */
export function Logo({ onDark = false, height = 40 }: { onDark?: boolean; height?: number }) {
  const width = Math.round((height * 1272) / 457);
  const img = (
    <Image
      src="/static/logo.png"
      alt="BookYourIELTS.com"
      width={width}
      height={height}
      priority
      style={{ height, width: "auto" }}
    />
  );
  if (!onDark) return img;
  return <span className="bg-white-ish inline-block rounded-md px-3 py-2">{img}</span>;
}
