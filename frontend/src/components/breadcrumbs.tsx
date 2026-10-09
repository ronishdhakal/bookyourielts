import Link from "next/link";
import { breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "./json-ld";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-muted text-sm">
        <ol className="flex flex-wrap items-center gap-x-2">
          {all.map((it, i) => (
            <li key={it.path} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-ink">
                  {it.name}
                </span>
              ) : (
                <Link href={it.path} className="underline-offset-4 hover:underline">
                  {it.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </>
  );
}
