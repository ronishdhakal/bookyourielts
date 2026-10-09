"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi, catalogApi } from "@/lib/api";
import { APP_URL, portalHref, siteHref } from "@/lib/portal";
import type { SiteInfo } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { Logo } from "../logo";

const TABS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/bookings", label: "Bookings", match: (p: string) => p.startsWith("/bookings") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") },
];

/** Logical path inside the portal, independent of whether it is served at / or /portal. */
function logicalPath(pathname: string) {
  return pathname.replace(/^\/portal/, "") || "/";
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = logicalPath(usePathname());
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    catalogApi.site().then(setSite, () => undefined);
  }, []);

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
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="on-dark bg-ink text-[0.8125rem] text-white">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <a href={siteHref("/?site=1")} className="text-white/80 hover:underline">
            ← bookyourielts.com
          </a>
          {site?.contact_phone && (
            <a
              href={`tel:${site.contact_phone.replace(/\s/g, "")}`}
              className="font-medium hover:underline"
            >
              Need help? {site.contact_phone}
            </a>
          )}
        </div>
      </div>

      <header className="border-mist sticky top-0 z-30 border-b bg-white">
        <div className="container-page flex h-16 items-center gap-8">
          <Link href={portalHref("/")} aria-label="Student home" className="shrink-0">
            <Logo height={36} />
          </Link>
          <nav aria-label="Portal" className="hidden h-full items-stretch gap-1 md:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={portalHref(t.href)}
                aria-current={t.match(pathname) ? "page" : undefined}
                className="hover:text-crimson aria-[current=page]:border-crimson aria-[current=page]:text-crimson flex items-center border-b-2 border-transparent px-4 text-[0.9375rem] font-medium aria-[current=page]:font-semibold"
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="relative ml-auto">
            <button
              type="button"
              aria-expanded={menu}
              aria-haspopup="menu"
              onClick={() => setMenu((m) => !m)}
              className="border-mist hover:border-ink flex min-h-11 items-center gap-2.5 rounded-lg border py-1 pr-3 pl-1.5"
            >
              <span
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#c9ced5]"
                aria-hidden
              >
                <svg
                  viewBox="0 0 100 100"
                  className="h-7 w-7 translate-y-1 text-white"
                  fill="currentColor"
                >
                  <circle cx="50" cy="36" r="18" />
                  <path d="M14 100c0-22 16-36 36-36s36 14 36 36z" />
                </svg>
              </span>
              <span className="hidden max-w-[10rem] truncate text-[0.875rem] font-semibold sm:inline">
                {user.full_name}
              </span>
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden fill="currentColor">
                <path d="M5 7l5 6 5-6z" />
              </svg>
            </button>
            {menu && (
              <div
                role="menu"
                className="panel absolute right-0 mt-2 w-56 py-2 shadow-lg"
                onClick={() => setMenu(false)}
              >
                {user.is_staff && (
                  <Link
                    role="menuitem"
                    href={portalHref("/manage")}
                    className="block px-4 py-2.5 font-semibold hover:bg-black/5"
                  >
                    Admin dashboard
                  </Link>
                )}
                <Link
                  role="menuitem"
                  href={portalHref("/profile")}
                  className="block px-4 py-2.5 hover:bg-black/5"
                >
                  My profile
                </Link>
                <Link
                  role="menuitem"
                  href={portalHref("/bookings")}
                  className="block px-4 py-2.5 hover:bg-black/5"
                >
                  My bookings
                </Link>
                <a
                  role="menuitem"
                  href={siteHref("/ielts-test-dates")}
                  className="block px-4 py-2.5 hover:bg-black/5"
                >
                  Browse test dates
                </a>
                <button
                  role="menuitem"
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
            )}
          </div>
        </div>
      </header>

      <main id="main" className="container-page py-6 md:py-10">
        {children}
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Portal"
        className="border-mist fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-white md:hidden"
      >
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={portalHref(t.href)}
            aria-current={t.match(pathname) ? "page" : undefined}
            className="aria-[current=page]:text-crimson aria-[current=page]:border-crimson flex min-h-14 items-center justify-center border-t-2 border-transparent text-[0.8125rem] font-semibold"
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
