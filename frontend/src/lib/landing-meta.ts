import type { Metadata } from "next";
import { INDEXABLE_MIN_WORDS } from "./seo-config";
import { pageMetadata } from "./seo";

/** The shared indexability rule: open dates, or enough unique factual copy. */
export function isIndexable(openCount: number, words: number): boolean {
  return openCount > 0 || words >= INDEXABLE_MIN_WORDS;
}

/** Canonical path for a list page: ?page=N stays self-referencing, filters collapse to the clean URL. */
export function listingPath(
  base: string,
  raw: Record<string, string | string[] | undefined>,
  knownFilterKeys: string[],
): string {
  const has = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  };
  if (knownFilterKeys.some(has)) return base;
  const p = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  return Number.isInteger(p) && p > 1 ? `${base}?page=${p}` : base;
}

export function landingMetadata(opts: {
  title: string;
  description: string;
  path: string;
  indexable: boolean;
}): Metadata {
  return pageMetadata({
    title: opts.title,
    description: opts.description,
    path: opts.path,
    noindex: !opts.indexable,
  });
}
