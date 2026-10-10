"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, manageApi } from "@/lib/api";
import { portalHref, siteHref } from "@/lib/portal";
import type { Stats } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useAuth } from "../auth-provider";
import { Logo } from "../logo";

const StatsContext = createContext<{
  stats: Stats | null;
  reload: () => void;
  error: string | null;
}>({
  stats: null,
  reload: () => undefined,
  error: null,
});
export const useStats = () => useContext(StatsContext);

const NAV = [
  { href: "/manage", label: "Overview", exact: true },
  { href: "/manage/bookings", label: "Booking requests", badge: "initiated" as const },
  { href: "/manage/inquiries", label: "Inquiries", badge: "inquiries" as const },
  { href: "/manage/users", label: "Users" },
  { href: "/manage/dates", label: "Test dates" },
  { href: "/manage/settings", label: "Settings" },
];

function logical(pathname: string) {
  return pathname.replace(/^\/portal/, "") || "/";
}

export function ManageShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = logical(usePathname());
  const [open, setOpen] = useState<string | null>(null);
  const menuOpen = open === pathname;
  const isStaff = !!user?.is_staff;
  const statsLoader = useLoader(isStaff ? "stats" : null, () => manageApi.stats());

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Clear a stale session cookie first so the sign-in page is not bounced straight back here.
      authApi.logout().finally(() => {
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      });
    } else if (!user.is_staff) {
      window.location.replace(portalHref("/"));
    }
  }, [loading, user]);

  const ctx = useMemo(
    () => ({ stats: statsLoader.data, reload: statsLoader.reload, error: statsLoader.error }),
    [statsLoader.data, statsLoader.reload, statsLoader.error],
  );

  if (loading || !user || !user.is_staff) {
    return (
      <div className="container-page py-16" role="status" aria-label="Loading">
        <div className="skeleton-light h-10 w-56 rounded-md" />
        <div className="skeleton-light mt-6 h-72 rounded-md" />
      </div>
    );
  }

  const badge = (b?: "initiated" | "inquiries") => {
    const n =
      b === "initiated"
        ? ctx.stats?.bookings.initiated
        : b === "inquiries"
          ? ctx.stats?.new_inquiries
          : 0;
    return n ? (
      <span className="bg-crimson ml-auto rounded-full px-2 py-0.5 font-mono text-xs font-semibold text-white">
        {n}
      </span>
    ) : null;
  };

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={portalHref(n.href)}
            aria-current={active ? "page" : undefined}
            className="hover:bg-ink/5 aria-[current=page]:bg-ink aria-[current=page]:text-paper flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] font-medium"
          >
            {n.label}
            {badge(n.badge)}
          </Link>
        );
      })}
    </nav>
  );

  const secondary = (
    <div className="border-mist mt-6 border-t pt-4 text-[0.875rem]">
      <a
        href={siteHref("/admin/")}
        className="text-muted hover:text-ink block py-1.5 hover:underline"
      >
        Advanced admin (Django) ↗
      </a>
      <Link
        href={`${portalHref("/")}?student=1`}
        className="text-muted hover:text-ink block py-1.5 hover:underline"
      >
        Student view
      </Link>
      <a
        href={siteHref("/?site=1")}
        className="text-muted hover:text-ink block py-1.5 hover:underline"
      >
        Public website
      </a>
      <button
        type="button"
        className="text-crimson block py-1.5 font-semibold hover:underline"
        onClick={async () => {
          await logout();
          window.location.assign(siteHref("/?site=1"));
        }}
      >
        Log out
      </button>
    </div>
  );

  return (
    <StatsContext.Provider value={ctx}>
      <div className="bg-paper min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="bg-white-ish border-mist hidden border-r lg:block">
          <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto p-4">
            <Link
              href={portalHref("/manage")}
              className="mb-1 flex items-center gap-2 px-1 py-2"
              aria-label="Admin overview"
            >
              <Logo height={30} />
            </Link>
            <p className="text-muted mb-5 px-1 font-mono text-[0.75rem] tracking-wide">
              ADMIN DASHBOARD
            </p>
            {nav}
            {secondary}
            <p className="text-muted mt-auto pt-6 text-[0.8125rem]">
              Signed in as
              <br />
              <span className="text-ink font-medium">{user.full_name}</span>
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="bg-white-ish border-mist sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
            <Link href={portalHref("/manage")} aria-label="Admin overview">
              <Logo height={28} />
            </Link>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="admin-menu"
              className="btn btn-outline btn-sm"
              onClick={() => setOpen(menuOpen ? null : pathname)}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </header>
          {menuOpen && (
            <div id="admin-menu" className="bg-white-ish border-mist border-b p-4 lg:hidden">
              {nav}
              {secondary}
            </div>
          )}
          <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </StatsContext.Provider>
  );
}
