"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { PortalNotification } from "@/lib/types";
import { usePortalData } from "./portal-data";

const LABEL: Record<PortalNotification["kind"], string> = {
  received: "Request received",
  confirmed: "Booking confirmed",
  cancelled: "Cancelled",
  assigned: "Session and venue",
  change_resolved: "Change handled",
  remark: "Message from our team",
  date_changed: "Date changed",
};

export function Notifications() {
  const { notifications, unread, markRead, bookings } = usePortalData();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Notifications</h1>
          <p className="text-muted mt-1">
            Updates on your bookings from our team. We also email you; you can change that in{" "}
            <Link href={portalHref("/profile")} className="underline">
              Profile
            </Link>
            .
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void markRead({ all: true })}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-6">
        {bookings === null ? (
          <div className="skeleton-light h-40 rounded-lg" role="status" aria-label="Loading" />
        ) : notifications.length === 0 ? (
          <div className="panel panel-pad text-center">
            <p className="font-semibold">Nothing yet</p>
            <p className="text-muted mt-1">
              When you book a date and our team confirms it, you will see it here.
            </p>
            <Link href={portalHref("/dates")} className="btn btn-primary mt-4">
              Find a date
            </Link>
          </div>
        ) : (
          <ul className="panel divide-mist divide-y">
            {notifications.map((n) => (
              <li key={n.id} className={n.is_read ? "" : "bg-crimson/[0.04]"}>
                <div className="flex gap-4 px-5 py-4">
                  <span
                    aria-hidden
                    className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? "bg-mist" : "bg-crimson"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted text-[0.8125rem] font-semibold tracking-wide uppercase">
                      {LABEL[n.kind]}
                      {!n.is_read && <span className="sr-only"> (new)</span>}
                    </p>
                    <p className={`mt-0.5 ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</p>
                    <p className="text-muted mt-1 text-[0.9375rem]">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.875rem]">
                      <span className="text-muted">{timeAgo(n.created_at)}</span>
                      {n.booking_id && (
                        <Link
                          href={portalHref(`/bookings/${n.booking_id}`)}
                          onClick={() => !n.is_read && void markRead({ ids: [n.id] })}
                          className="font-semibold underline"
                        >
                          Open booking
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          type="button"
                          className="underline"
                          onClick={() => void markRead({ ids: [n.id] })}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
