import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { fetchCities } from "@/lib/server-api";

export const revalidate = 3600;

const STATIC: {
  path: string;
  priority: number;
  freq: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1, freq: "daily" },
  { path: "/ielts-booking-nepal", priority: 0.9, freq: "weekly" },
  { path: "/ielts-test-dates", priority: 0.9, freq: "daily" },
  { path: "/ielts-fee-nepal", priority: 0.8, freq: "weekly" },
  { path: "/ielts-on-computer-nepal", priority: 0.7, freq: "monthly" },
  { path: "/ielts-academic-vs-general-training", priority: 0.7, freq: "monthly" },
  { path: "/inquire", priority: 0.5, freq: "monthly" },
  { path: "/about", priority: 0.4, freq: "yearly" },
  { path: "/contact", priority: 0.4, freq: "yearly" },
  { path: "/privacy", priority: 0.2, freq: "yearly" },
  { path: "/terms", priority: 0.2, freq: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = (await fetchCities()) ?? [];
  const now = new Date();
  return [
    ...STATIC.map((s) => ({
      url: `${SITE_URL}${s.path}`,
      lastModified: now,
      changeFrequency: s.freq,
      priority: s.priority,
    })),
    ...cities.map((c) => ({
      url: `${SITE_URL}/ielts-test-dates/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
