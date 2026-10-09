"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { catalogApi } from "@/lib/api";
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
      window.location.replace(`/login?next=${encodeURIComponent(here)}`);
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

  const initials = user.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="bg-paper min-h-screen pb-24 md:pb-0">
      <div className="bg-spruce text-board text-[0.8125rem]">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <a href={siteHref("/")} className="hover:underline">
            ← bookyourielts.com
          </a>
          {site?.contact_phone && (
            <a
              href={`tel:${site.contact_phone.replace(/\s/g, "")}`}
              className="font-mono hover:underline"
            >
              Need help? {site.contact_phone}
            </a>
          )}
        </div>
      </div>

      <header className="border-mist bg-white-ish sticky top-0 z-30 border-b">
        <div className="container-page flex h-16 items-center gap-6">
          <Link href={portalHref("/")} aria-label="Student home">
            <Logo height={34} />
          </Link>
          <nav aria-label="Portal" className="hidden h-full items-stretch gap-1 md:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={portalHref(t.href)}
                aria-current={t.match(pathname) ? "page" : undefined}
                className="aria-[current=page]:after:bg-crimson relative flex items-center px-4 text-[0.9375rem] font-medium hover:bg-black/5 aria-[current=page]:font-bold aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5"
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
              className="border-mist hover:border-ink flex min-h-11 items-center gap-2.5 rounded-full border py-1 pr-3 pl-1 transition-colors"
            >
              <span className="bg-spruce text-board flex h-9 w-9 items-center justify-center rounded-full font-mono text-sm font-semibold">
                {initials || "?"}
              </span>
              <span className="hidden max-w-[10rem] truncate text-[0.9375rem] font-medium sm:inline">
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
                    window.location.assign(siteHref("/"));
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
        className="border-mist bg-white-ish fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t md:hidden"
      >
        {[
          ...TABS.slice(0, 2),
          {
            href: "/book",
            label: "Book",
            match: (p: string) => p.startsWith("/book") && !p.startsWith("/bookings"),
          },
          TABS[2]!,
        ].map((t) => (
          <Link
            key={t.href}
            href={portalHref(t.href)}
            aria-current={t.match(pathname) ? "page" : undefined}
            className="aria-[current=page]:text-crimson aria-[current=page]:border-crimson flex min-h-14 items-center justify-center text-[0.8125rem] font-semibold aria-[current=page]:border-t-2"
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
