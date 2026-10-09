import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The Docker image sets NEXT_OUTPUT=standalone; local `next start` does not support it.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // The dev API server drops idle keep-alive connections; reusing one makes the proxy fail with "socket hang up".
  httpAgentOptions: { keepAlive: false },
  // Django owns trailing slashes on /api/*; Next must not redirect them or the two loop.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Browser calls /api/... on our own origin so session and CSRF cookies stay first-party.
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      // In development there is no nginx, so the Django admin is reached through the same proxy.
      { source: "/admin/:path*", destination: `${API_ORIGIN}/admin/:path*` },
      { source: "/django-static/:path*", destination: `${API_ORIGIN}/django-static/:path*` },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
