import type { Metadata } from "next";
import type { Faq, TestSession } from "./types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookyourielts.com").replace(
  /\/$/,
  "",
);
export const SITE_NAME = "bookyourielts.com";

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${opts.path}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      url,
      locale: "en_NP",
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description },
  };
}

export const organizationLd = (contactEmail?: string, phone?: string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: "Independent IELTS booking assistance for students in Nepal.",
  areaServed: { "@type": "Country", name: "Nepal" },
  ...(contactEmail || phone
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          availableLanguage: ["English", "Nepali"],
          ...(contactEmail ? { email: contactEmail } : {}),
          ...(phone ? { telephone: phone } : {}),
        },
      }
    : {}),
});

export const faqLd = (faqs: Pick<Faq, "question" | "answer">[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer.replace(/\n+/g, " ") },
  })),
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
});

const SLOT_START: Record<string, string> = { morning: "09:00:00", afternoon: "13:00:00" };
const SLOT_END: Record<string, string> = { morning: "12:00:00", afternoon: "16:00:00" };

export const eventsLd = (sessions: TestSession[]) =>
  sessions.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${s.test_type.name} (${s.format_label}) in ${s.city.name}`,
    startDate: `${s.date}T${SLOT_START[s.slot]}+05:45`,
    endDate: `${s.date}T${SLOT_END[s.slot]}+05:45`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: s.venue?.name ?? `${s.city.name} test centre`,
      address: {
        "@type": "PostalAddress",
        addressLocality: s.city.name,
        addressCountry: "NP",
        ...(s.venue?.address ? { streetAddress: s.venue.address } : {}),
      },
    },
    offers: {
      "@type": "Offer",
      price: s.fee_npr,
      priceCurrency: "NPR",
      url: `${SITE_URL}/book/${s.id}`,
      availability: s.is_bookable ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      validThrough: s.registration_closes_on,
    },
  }));
