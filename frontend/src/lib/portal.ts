/**
 * Links between the marketing site (bookyourielts.com) and the student portal (users.bookyourielts.com).
 *
 * In production NEXT_PUBLIC_APP_URL is the portal origin and the portal lives at the root of its own host.
 * In development it is empty and the portal is served under /portal on the same host.
 */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** Link from anywhere (usually the marketing site) to a portal page. */
export function appHref(path = "/"): string {
  if (APP_URL) return `${APP_URL}${path}`;
  return `/portal${path === "/" ? "" : path}`;
}

/** Link between two portal pages. Same as appHref, but stays relative on the portal host. */
export function portalHref(path = "/"): string {
  if (APP_URL) return path;
  return `/portal${path === "/" ? "" : path}`;
}

/** Link from the portal back to a marketing page. */
export function siteHref(path = "/"): string {
  return APP_URL && SITE_URL ? `${SITE_URL}${path}` : path;
}

/** Hard navigation, used after login so the destination can be on another host. */
export function go(url: string) {
  window.location.assign(url);
}
