"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { catalogApi } from "@/lib/api";
import { portalHref } from "@/lib/portal";
import { useLoader } from "@/lib/use-loader";
import { PROVIDERS } from "./wizard-types";

/** The "Choose provider" dialog. A native dialog element gives focus trapping and Escape for free. */
export function ProviderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const counts = useLoader(open ? "counts" : null, async (signal) => {
    const rows = await Promise.all(
      PROVIDERS.map((p) =>
        catalogApi.sessions({ provider: p.code, hide_closed: "true", page_size: "1" }, signal),
      ),
    );
    return Object.fromEntries(PROVIDERS.map((p, i) => [p.code, rows[i]?.count ?? 0]));
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="provider-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl p-0 shadow-2xl backdrop:bg-black/50"
    >
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="provider-title" className="text-2xl font-bold">
              Choose provider
            </h2>
            <p className="text-muted mt-1">Select the IELTS exam provider you want to sit with.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-2 -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-black/5"
          >
            ×
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PROVIDERS.map((p) => {
            const n = counts.data?.[p.code];
            return (
              <button
                key={p.code}
                type="button"
                className="choice text-left"
                onClick={() => router.push(portalHref(`/book?provider=${p.code}`))}
              >
                <span className="block text-lg font-bold">{p.label}</span>
                <span className="text-muted mt-1 block text-[0.875rem]">
                  {counts.loading
                    ? "Checking dates…"
                    : `${n ?? 0} open ${n === 1 ? "date" : "dates"}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
