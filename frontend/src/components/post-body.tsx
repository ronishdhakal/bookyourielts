import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders the plain-text blog format written in the admin: blank line = paragraph, "## " and "### "
 * headings, "- " bullets, "1. " steps, "**bold**" and "[text](url)". No raw HTML is ever rendered.
 */
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={i++}>{m[1]}</strong>);
    else {
      const label = m[2] ?? "";
      const href = m[3] ?? "";
      if (href.startsWith("/") && !href.startsWith("//"))
        out.push(
          <Link key={i++} href={href}>
            {label}
          </Link>,
        );
      else if (/^https?:\/\//.test(href))
        out.push(
          <a key={i++} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>,
        );
      else out.push(label);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function PostBody({ body }: { body: string }) {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/);
  return (
    <div className="prose-page">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0] ?? "";
        if (first.startsWith("### ")) return <h3 key={i}>{inline(first.slice(4))}</h3>;
        if (first.startsWith("## ")) return <h2 key={i}>{inline(first.slice(3))}</h2>;
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+\.\s/.test(l)))
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}

/** Reading time in whole minutes (about 200 words a minute). */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));
}
