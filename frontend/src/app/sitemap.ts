import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { PROVIDER_PAGES, TYPE_PAGES, monthSlug, monthsWithSessions } from "@/lib/landing";
import { ALWAYS_INDEXABLE_CITIES, NOINDEX_THIN_PAGES } from "@/lib/seo-config";
import { SITE_URL } from "@/lib/seo";
import { fetchCities, fetchOpenSessions, fetchPosts } from "@/lib/server-api";
import type { TestSession } from "@/lib/types";

// Rendered per request (data is cached by the fetch layer). Prerendering at build would bake in
// an empty page, because the API is not reachable while the Docker image is built.
export const dynamic = "force-dynamic";

/** Process start = deploy time. Used as lastmod for pages whose content only changes with a release. */
const DEPLOYED_AT = new Date();

const latest = (sessions: TestSession[]): Date | undefined => {
  const iso = sessions.map((s) => s.updated_at).reduce<string>((a, b) => (a > b ? a : b), "");
  return iso ? new Date(iso) : undefined;
};

/**
 * Only indexable, canonical, 200 URLs, each with a real lastmod: the newest data change among the
 * sessions the page shows, or the deploy time for pages that only change with a release.
 * (Google ignores changefreq and priority, so they are left out.)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, open, posts] = await Promise.all([
    fetchCities(),
    fetchOpenSessions(),
    fetchPosts(),
  ]);
  const sessions = open?.results ?? [];
  const dataDate = latest(sessions) ?? DEPLOYED_AT;
  // The home canonical has no trailing slash (Next strips it), so the sitemap matches that form.
  const entry = (path: string, lastModified: Date) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified,
  });

  const staticPages = [
    "/ielts-booking-nepal",
    "/ielts-on-computer-nepal",
    "/ielts-academic-vs-general-training",
    ...GUIDES.map((g) => g.path),
    "/inquire",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ];

  return [
    entry("/", dataDate),
    entry("/ielts-test-dates", dataDate),
    entry("/ielts-fee-nepal", dataDate),
    ...staticPages.map((p) => entry(p, DEPLOYED_AT)),
    ...(posts.length
      ? [entry("/blog", new Date(posts.map((p) => p.updated_at).reduce((a, b) => (a > b ? a : b))))]
      : []),
    ...posts.map((p) => entry(`/blog/${p.slug}`, new Date(p.updated_at))),
    ...(cities ?? [])
      .filter(
        (c) =>
          !NOINDEX_THIN_PAGES || ALWAYS_INDEXABLE_CITIES.includes(c.slug) || c.upcoming_count > 0,
      )
      .map((c) =>
        entry(
          `/ielts-test-dates/${c.slug}`,
          latest(sessions.filter((s) => s.city.slug === c.slug)) ?? DEPLOYED_AT,
        ),
      ),
    ...TYPE_PAGES.flatMap((t) => {
      const match = sessions.filter(
        (s) =>
          (t.filters.test_type ? s.test_type.code === t.filters.test_type : s.test_type.is_ukvi) &&
          (t.match ? t.match(s) : true),
      );
      return match.length || !NOINDEX_THIN_PAGES ? [entry(t.path, latest(match) ?? dataDate)] : [];
    }),
    ...monthsWithSessions(sessions).map((m) =>
      entry(
        `/ielts-test-dates/${monthSlug(m)}`,
        latest(sessions.filter((s) => s.date.startsWith(m))) ?? dataDate,
      ),
    ),
    ...PROVIDER_PAGES.flatMap((p) => {
      const match = sessions.filter((s) => s.provider === p.code);
      return match.length ? [entry(`/ielts-test-dates/${p.slug}`, latest(match) ?? dataDate)] : [];
    }),
  ];
}
