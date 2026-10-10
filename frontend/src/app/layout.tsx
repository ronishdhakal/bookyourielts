import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import { JsonLd } from "@/components/json-ld";
import { getSite } from "@/lib/site";
import { SITE_NAME, SITE_URL, organizationLd } from "@/lib/seo";
import "./globals.css";

/** Google Analytics. Only loads in production builds; override the id with NEXT_PUBLIC_GA_ID. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-DFESYKD5QR";

const sans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set absolute titles through pageMetadata, so the brand is never appended twice.
  title: {
    default: "IELTS Booking in Nepal: Dates, Fees & Seats",
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
  themeColor: "#f1f3f5",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <a
          href="#main"
          className="bg-ink text-paper fixed top-2 left-2 z-50 -translate-y-20 rounded px-4 py-3 font-semibold focus:translate-y-0"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
        <JsonLd data={organizationLd(site.contact_email, site.contact_phone)} />
        {process.env.NODE_ENV === "production" && GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
