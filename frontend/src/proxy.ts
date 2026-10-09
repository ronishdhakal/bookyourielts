import { NextResponse, type NextRequest } from "next/server";

/**
 * Host routing. users.<domain> serves the student portal at its root (internally /portal/...),
 * the marketing host redirects /portal/* to the portal host. Without NEXT_PUBLIC_APP_URL (local
 * development) nothing is rewritten and the portal is reachable under /portal.
 */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const APP_HOST = APP_URL ? new URL(APP_URL).host : "";

// Pages that exist once and are shared by both hosts.
const SHARED = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

const SESSION_COOKIE = "sessionid";

export function proxy(req: NextRequest) {
  // A signed-in visitor on the marketing home goes straight to their dashboard (?site=1 opts out).
  // Students land on the portal home; staff are sent on to the admin dashboard from there.
  if (
    req.nextUrl.pathname === "/" &&
    req.cookies.has(SESSION_COOKIE) &&
    !req.nextUrl.searchParams.has("site") &&
    (!APP_HOST || req.headers.get("host") !== APP_HOST)
  ) {
    return NextResponse.redirect(new URL(APP_URL ? `${APP_URL}/` : "/portal", req.url));
  }
  if (!APP_HOST) return NextResponse.next();
  const host = req.headers.get("host") ?? "";
  const { pathname, search } = req.nextUrl;

  if (host === APP_HOST) {
    if (pathname === "/portal" || pathname.startsWith("/portal/")) {
      const clean = pathname.replace(/^\/portal/, "") || "/";
      return NextResponse.redirect(new URL(`${clean}${search}`, APP_URL));
    }
    if (SHARED.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
      return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = `/portal${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.redirect(
      new URL(`${pathname.replace(/^\/portal/, "") || "/"}${search}`, APP_URL),
    );
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, the API proxy and static files.
  matcher: ["/((?!_next/|api/|static/|.*\\..*).*)"],
};
