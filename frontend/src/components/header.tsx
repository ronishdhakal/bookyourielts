"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { appHref } from "@/lib/portal";
import { useAuth } from "./auth-provider";
import { Logo } from "./logo";

const NAV = [
  { href: "/ielts-test-dates", label: "Test dates" },
  { href: "/ielts-fee-nepal", label: "Fees" },
  { href: "/ielts-on-computer-nepal", label: "IELTS on computer" },
  { href: "/ielts-academic-vs-general-training", label: "Academic or General?" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Header({ phone }: { phone?: string }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  async function onLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const dashboardHref = appHref(user?.is_staff ? "/manage" : "/");
  const authLinks = loading ? (
    <span className="inline-block h-10 w-28" aria-hidden />
  ) : user ? (
    <>
      <a href={dashboardHref} className="btn btn-primary btn-sm">
        {user.is_staff ? "Admin dashboard" : "My dashboard"}
      </a>
      <button
        type="button"
        onClick={onLogout}
        className="text-muted hover:text-ink text-[0.9375rem] font-medium"
      >
        Log out
      </button>
    </>
  ) : (
    <>
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="text-[0.9375rem] font-semibold underline-offset-4 hover:underline"
      >
        Log in
      </Link>
      <Link href="/ielts-test-dates" className="btn btn-primary btn-sm">
        Find a date
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40">
      <div className="on-dark bg-ink hidden text-[0.8125rem] text-white md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <p className="text-white/80">
            Independent IELTS booking assistance for students in Nepal
          </p>
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-medium hover:underline">
              Call us: {phone}
            </a>
          )}
        </div>
      </div>
      <div className="border-mist border-b bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <Link
            href={user ? "/?site=1" : "/"}
            aria-label="bookyourielts.com home"
            className="shrink-0"
          >
            <Logo height={38} />
          </Link>

          <nav aria-label="Main" className="hidden h-full items-stretch gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                className="hover:text-crimson aria-[current=page]:text-crimson aria-[current=page]:border-crimson relative flex items-center border-b-2 border-transparent px-3.5 text-[0.9375rem] font-medium"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">{authLinks}</div>

          <button
            type="button"
            className="-mr-2 inline-flex h-12 w-12 items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <div id="mobile-menu" className="border-mist border-t bg-white lg:hidden">
            <nav aria-label="Mobile" className="container-page flex flex-col py-2">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="border-mist border-b py-3.5 font-medium"
                >
                  {n.label}
                </Link>
              ))}
              <div className="flex items-center gap-5 py-4">{authLinks}</div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
