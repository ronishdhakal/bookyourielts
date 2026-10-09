"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { alertApi, bookingApi, notificationApi } from "@/lib/api";
import type { Booking, DateAlert, PortalNotification } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useAuth } from "../auth-provider";

interface PortalData {
  bookings: Booking[] | null;
  alerts: DateAlert[] | null;
  notifications: PortalNotification[];
  unread: number;
  markRead: (what: { ids: number[] } | { all: true }) => Promise<void>;
  error: string | null;
  reload: () => void;
}

const Ctx = createContext<PortalData>({
  bookings: null,
  alerts: null,
  notifications: [],
  unread: 0,
  markRead: async () => undefined,
  error: null,
  reload: () => undefined,
});
export const usePortalData = () => useContext(Ctx);

/** One shared fetch of the student's bookings and alerts, so the sidebar badges and the pages agree. */
export function PortalDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const load = useLoader(user ? "portal-data" : null, async () => {
    const [bookings, alerts, notes] = await Promise.all([
      bookingApi.mine(),
      alertApi.list(),
      notificationApi.list().catch(() => ({ unread: 0, results: [] })),
    ]);
    return { bookings, alerts, notes };
  });
  const { reload } = load;
  const markRead = useCallback(
    async (what: { ids: number[] } | { all: true }) => {
      await notificationApi.markRead(what).catch(() => undefined);
      reload();
    },
    [reload],
  );
  // Pick up news (for example a confirmed booking) while the page stays open.
  useEffect(() => {
    if (!user) return;
    const tick = () => document.visibilityState === "visible" && reload();
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [user, reload]);
  const value = useMemo(
    () => ({
      bookings: load.data?.bookings ?? null,
      alerts: load.data?.alerts ?? null,
      notifications: load.data?.notes.results ?? [],
      unread: load.data?.notes.unread ?? 0,
      markRead,
      error: load.error,
      reload: load.reload,
    }),
    [load.data, load.error, load.reload, markRead],
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
