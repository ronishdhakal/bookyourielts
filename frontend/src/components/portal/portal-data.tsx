"use client";

import { createContext, useContext, useMemo } from "react";
import { alertApi, bookingApi } from "@/lib/api";
import type { Booking, DateAlert } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useAuth } from "../auth-provider";

interface PortalData {
  bookings: Booking[] | null;
  alerts: DateAlert[] | null;
  error: string | null;
  reload: () => void;
}

const Ctx = createContext<PortalData>({
  bookings: null,
  alerts: null,
  error: null,
  reload: () => undefined,
});
export const usePortalData = () => useContext(Ctx);

/** One shared fetch of the student's bookings and alerts, so the sidebar badges and the pages agree. */
export function PortalDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const load = useLoader(user ? "portal-data" : null, async () => {
    const [bookings, alerts] = await Promise.all([bookingApi.mine(), alertApi.list()]);
    return { bookings, alerts };
  });
  const value = useMemo(
    () => ({
      bookings: load.data?.bookings ?? null,
      alerts: load.data?.alerts ?? null,
      error: load.error,
      reload: load.reload,
    }),
    [load.data, load.error, load.reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export interface Task {
  key: string;
  text: string;
  href: string;
  action: string;
}

/** What a student still needs to do for one booking. */
export function bookingTasks(b: Booking, hrefFor: (id: number) => string): Task[] {
  if (b.status === "cancelled") return [];
  const tasks: Task[] = [];
  if (!b.has_passport) {
    tasks.push({
      key: `pp-${b.id}`,
      text: `Add the passport for ${b.reference}`,
      href: hrefFor(b.id),
      action: "Upload",
    });
  }
  return tasks;
}
