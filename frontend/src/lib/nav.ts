/** Only allow same-site relative redirects, never //evil.com or full URLs. */
export function safeNext(next: string | string[] | undefined, fallback = "/dashboard"): string {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  return v;
}
