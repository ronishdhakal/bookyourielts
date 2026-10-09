"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi, catalogApi } from "@/lib/api";
import { APP_URL, portalHref, siteHref } from "@/lib/portal";
import { timeAgo } from "@/lib/format";
import type { SiteInfo } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { Logo } from "../logo";
import { PortalDataProvider, bookingTasks, usePortalData } from "./portal-data";

const ICONS = {
  home: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  dates: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5",
  bookings: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  people:
    "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 100-6M21 20c0-2-1.5-3.5-4-4.5",
  bell: "M6 17h12l-1.5-2V11a4.5 4.5 0 00-9 0v4zM10 20h4",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01",
};

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Dashboard", icon: ICONS.home, match: (p: string) => p === "/" },
  {
    href: "/dates",
    label: "Find a date",
    icon: ICONS.dates,
    match: (p: string) => p.startsWith("/dates") || p === "/book",
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: ICONS.bookings,
    match: (p: string) => p.startsWith("/bookings"),
    badge: "tasks" as const,
  },
  {
    href: "/candidates",
    label: "Candidates",
    icon: ICONS.people,
    match: (p: string) => p.startsWith("/candidates"),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: ICONS.bell,
    match: (p: string) => p.startsWith("/alerts"),
    badge: "alerts" as const,
  },
  {
    href: "/help",
    label: "Help",
    icon: ICONS.help,
    match: (p: string) => p.startsWith("/help"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: ICONS.user,
    match: (p: string) => p.startsWith("/profile"),
  },
];

/** Logical path inside the portal, independent of whether it is served at / or /portal. */
function logicalPath(pathname: string) {
  return pathname.replace(/^\/portal/, "") || "/";
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // A relative path in dev; the full portal URL in production, where login may run on the other host.
      const here = APP_URL
        ? window.location.href
        : window.location.pathname + window.location.search;
      // Clear a stale session cookie first, otherwise the marketing site would keep sending the visitor back.
      authApi
        .logout()
        .finally(() => window.location.replace(`/login?next=${encodeURIComponent(here)}`));
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="container-page py-16" role="status" aria-label="Loading your account">
        <div className="skeleton-light h-12 w-64 rounded-md" />
        <div className="skeleton-light mt-6 h-64 rounded-md" />
      </div>
    );
  }
  return (
    <PortalDataProvider>
      <Frame>{children}</Frame>
    </PortalDataProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { bookings, alerts, notifications: notes, unread, markRead } = usePortalData();
  const pathname = logicalPath(usePathname());
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [bell, setBell] = useState(false);

  useEffect(() => {
    catalogApi.site().then(setSite, () => undefined);
  }, []);

  if (!user) return null;
  const tasks = (bookings ?? []).flatMap((b) =>
    bookingTasks(b, (id) => portalHref(`/bookings/${id}`)),
  );
  const fresh = (alerts ?? []).filter((a) => a.is_active && a.new_matches > 0);
  const counts = { tasks: tasks.length, alerts: fresh.length };
  const notifications = unread + tasks.length + fresh.length;
  const menuOpen = menu === pathname;

  const nav = (
    <nav aria-label="Portal" className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const count = n.badge ? counts[n.badge] : 0;
        return (
          <Link
            key={n.href}
            href={portalHref(n.href)}
            aria-current={n.match(pathname) ? "page" : undefined}
            className="hover:bg-ink/5 aria-[current=page]:bg-crimson-tint aria-[current=page]:text-crimson-dark aria-[current=page]:border-crimson flex min-h-11 items-center gap-3 border-l-[3px] border-transparent px-4 text-[0.9375rem] font-medium aria-[current=page]:font-semibold"
          >
            <Icon d={n.icon} />
            {n.label}
            {count > 0 && (
              <span className="bg-crimson ml-auto rounded-full px-2 py-0.5 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="border-mist hidden border-r bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto py-5">
          <Link href={portalHref("/")} aria-label="Dashboard" className="px-5 pb-6">
            <Logo height={38} />
          </Link>
          {nav}
          <div className="mt-auto space-y-4 px-5 pt-6">
            <Link href={portalHref("/dates")} className="btn btn-primary w-full">
              Find a date
            </Link>
            {site?.contact_phone && (
              <div className="border-mist rounded-lg border p-3 text-[0.8125rem]">
                <p className="font-semibold">Need help?</p>
                <a
                  href={`tel:${site.contact_phone.replace(/\s/g, "")}`}
                  className="text-crimson font-semibold hover:underline"
                >
                  {site.contact_phone}
                </a>
              </div>
            )}
            <a
              href={siteHref("/?site=1")}
              className="text-muted block text-[0.8125rem] hover:underline"
            >
              ← bookyourielts.com
            </a>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        {/* Top bar */}
        <header className="border-mist sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-white px-4 md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Link href={portalHref("/")} aria-label="Dashboard">
              <Logo height={32} />
            </Link>
          </div>
          <p className="text-muted hidden text-[0.9375rem] lg:block">
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>

          <div className="relative ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                aria-label={`Notifications${notifications ? `, ${notifications} new` : ""}`}
                aria-expanded={bell}
                onClick={() => setBell((b) => !b)}
                className="hover:bg-ink/5 relative flex h-11 w-11 items-center justify-center rounded-full"
              >
                <Icon d={ICONS.bell} />
                {notifications > 0 && (
                  <span className="bg-crimson absolute top-1.5 right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-bold text-white">
                    {notifications}
                  </span>
                )}
              </button>
              {bell && (
                <div
                  role="menu"
                  className="panel absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] shadow-xl"
                  onClick={() => setBell(false)}
                >
                  <div className="border-mist flex items-center justify-between border-b px-4 py-3">
                    <p className="font-semibold">Notifications</p>
                    {unread > 0 && (
                      <button
                        type="button"
                        className="text-[0.8125rem] underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markRead({ all: true });
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {notifications === 0 && notes.length === 0 ? (
                    <p className="text-muted px-4 py-6 text-center text-[0.9375rem]">
                      You are all caught up.
                    </p>
                  ) : (
                    <ul className="divide-mist max-h-96 divide-y overflow-y-auto">
                      {notes.slice(0, 6).map((n) => (
                        <li key={`n${n.id}`}>
                          <Link
                            role="menuitem"
                            href={portalHref(
                              n.booking_id ? `/bookings/${n.booking_id}` : "/notifications",
                            )}
                            onClick={() => !n.is_read && void markRead({ ids: [n.id] })}
                            className="flex gap-3 px-4 py-3 hover:bg-[#f7f8fa]"
                          >
                            <span
                              aria-hidden
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-crimson"}`}
                            />
                            <span>
                              <span
                                className={`block text-[0.9375rem] ${n.is_read ? "" : "font-semibold"}`}
                              >
                                {n.title}
                                {!n.is_read && <span className="sr-only"> (new)</span>}
                              </span>
                              <span className="text-muted text-[0.8125rem]">
                                {timeAgo(n.created_at)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                      {fresh.map((a) => (
                        <li key={`a${a.id}`}>
                          <Link
                            role="menuitem"
                            href={portalHref("/alerts")}
                            className="block px-4 py-3 hover:bg-[#f7f8fa]"
                          >
                            <span className="block text-[0.9375rem] font-semibold">
                              {a.new_matches} new{" "}
                              {a.new_matches === 1 ? "date matches" : "dates match"} an alert
                            </span>
                            <span className="text-muted text-[0.8125rem]">
                              Open your alerts to see them
                            </span>
                          </Link>
                        </li>
                      ))}
                      {tasks.map((t) => (
                        <li key={t.key}>
                          <Link
                            role="menuitem"
                            href={t.href}
                            className="block px-4 py-3 hover:bg-[#f7f8fa]"
                          >
                            <span className="block text-[0.9375rem] font-semibold">{t.text}</span>
                            <span className="text-muted text-[0.8125rem]">To do</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={portalHref("/notifications")}
                    className="border-mist block border-t px-4 py-3 text-center text-[0.9375rem] font-semibold hover:bg-[#f7f8fa]"
                  >
                    See all notifications
                  </Link>
                </div>
              )}
            </div>

            <details className="group relative">
              <summary className="border-mist hover:border-ink flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg border py-1 pr-3 pl-1.5 [&::-webkit-details-marker]:hidden">
                <span
                  className="bg-ink flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                  aria-hidden
                >
                  {user.full_name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[10rem] truncate text-[0.875rem] font-semibold sm:inline">
                  {user.full_name}
                </span>
                <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden fill="currentColor">
                  <path d="M5 7l5 6 5-6z" />
                </svg>
              </summary>
              <div className="panel absolute right-0 mt-2 w-56 py-2 shadow-xl">
                {user.is_staff && (
                  <Link
                    href={portalHref("/manage")}
                    className="block px-4 py-2.5 font-semibold hover:bg-black/5"
                  >
                    Admin dashboard
                  </Link>
                )}
                <Link href={portalHref("/profile")} className="block px-4 py-2.5 hover:bg-black/5">
                  My profile
                </Link>
                <a
                  href={siteHref("/ielts-test-dates")}
                  className="block px-4 py-2.5 hover:bg-black/5"
                >
                  Public test dates
                </a>
                <button
                  type="button"
                  className="text-crimson block w-full px-4 py-2.5 text-left font-semibold hover:bg-black/5"
                  onClick={async () => {
                    await logout();
                    window.location.assign(siteHref("/?site=1"));
                  }}
                >
                  Log out
                </button>
              </div>
            </details>

            <button
              type="button"
              className="border-mist flex h-11 w-11 items-center justify-center rounded-lg border lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="portal-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenu(menuOpen ? null : pathname)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                {menuOpen ? (
                  <path d="M5 5l14 14M19 5L5 19" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </header>

        {menuOpen && (
          <div id="portal-menu" className="border-mist border-b bg-white py-2 lg:hidden">
            {nav}
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-[96rem] px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      {/* Phone bottom bar */}
      <nav
        aria-label="Quick links"
        className="border-mist fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-white lg:hidden"
      >
        {NAV.slice(0, 5)
          .filter((n) => n.href !== "/candidates")
          .map((n) => (
            <Link
              key={n.href}
              href={portalHref(n.href)}
              aria-current={n.match(pathname) ? "page" : undefined}
              className="aria-[current=page]:text-crimson aria-[current=page]:border-crimson flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-[0.6875rem] font-semibold"
            >
              <Icon d={n.icon} />
              {n.label === "Find a date" ? "Dates" : n.label}
            </Link>
          ))}
      </nav>
    </div>
  );
}
