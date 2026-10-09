"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Logo } from "./logo";

const NAV = [
  { href: "/ielts-test-dates", label: "Test dates" },
  { href: "/ielts-fee-nepal", label: "Fees" },
  { href: "/ielts-on-computer-nepal", label: "IELTS on computer" },
  { href: "/ielts-academic-vs-general-training", label: "Academic or General?" },
];

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // The menu is tied to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  async function onLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const authLinks = loading ? (
    <span className="inline-block h-10 w-28" aria-hidden />
  ) : user ? (
    <>
      <Link href="/dashboard" className="font-semibold underline-offset-4 hover:underline">
        My bookings
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="text-muted hover:text-ink underline-offset-4 hover:underline"
      >
        Log out
      </button>
    </>
  ) : (
    <>
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="font-semibold underline-offset-4 hover:underline"
      >
        Log in
      </Link>
      <Link href="/ielts-test-dates" className="btn btn-primary btn-sm">
        Book IELTS
      </Link>
    </>
  );

  return (
    <header className="border-mist bg-paper/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="bookyourielts.com home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 text-[0.9375rem] lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? "page" : undefined}
              className="underline-offset-8 hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 text-[0.9375rem] lg:flex">{authLinks}</div>

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
        <div id="mobile-menu" className="border-mist bg-paper border-t lg:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-2 text-lg">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="border-mist border-b py-3">
                {n.label}
              </Link>
            ))}
            <Link href="/contact" className="border-mist border-b py-3">
              Contact
            </Link>
            <div className="flex items-center gap-5 py-4 text-base">{authLinks}</div>
          </nav>
        </div>
      )}
    </header>
  );
}
