"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Filters kept in the URL, so views can be linked to and survive a refresh. Wrap the page in <Suspense>. */
export function useQueryState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = (k: string) => sp.get(k) ?? "";
  const set = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
        if (k !== "page") next.delete("page");
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );
  return { get, set, key: sp.toString() };
}
