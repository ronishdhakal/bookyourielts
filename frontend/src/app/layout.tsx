import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { JsonLd } from "@/components/json-ld";
import { getSite } from "@/lib/site";
import { SITE_NAME, SITE_URL, organizationLd } from "@/lib/seo";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IELTS Booking in Nepal: Test Dates, Fees & Seats | bookyourielts.com",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "IELTS booking in Nepal made simple. See open IELTS test dates in Kathmandu, Pokhara, Chitwan, Butwal and more, check seats and fees, and book your date online.",
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_NP" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f4f0",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main"
          className="bg-ink text-paper fixed top-2 left-2 z-50 -translate-y-20 rounded px-4 py-3 font-semibold focus:translate-y-0"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
        <JsonLd data={organizationLd(site.contact_email, site.contact_phone)} />
      </body>
    </html>
  );
}
