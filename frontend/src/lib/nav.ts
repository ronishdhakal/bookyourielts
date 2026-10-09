import { APP_URL, appHref, go } from "./portal";

/**
 * Only allow same-site relative redirects, or an address on our own portal host.
 * Never //evil.com or any other full URL.
 */
export function safeNext(next: string | string[] | undefined, fallback = appHref("/")): string {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v) return fallback;
  if (APP_URL && (v === APP_URL || v.startsWith(`${APP_URL}/`))) return v;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  return v;
}

/** Navigate after sign-in. Hard navigation when the destination is on another host. */
export function goNext(dest: string, push: (to: string) => void, refresh: () => void) {
  if (/^https?:\/\//.test(dest)) go(dest);
  else {
    push(dest);
    refresh();
  }
}
