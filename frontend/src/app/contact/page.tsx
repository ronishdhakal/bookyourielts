import { InfoPage } from "@/components/info-page";
import { whatsappLink } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getSite } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contact us",
  description:
    "Contact bookyourielts.com on WhatsApp, phone or email for help with IELTS booking in Nepal.",
  path: "/contact",
});

export const revalidate = 120;

export default async function ContactPage() {
  const site = await getSite();
  const wa = whatsappLink(site.whatsapp_number, "Hi, I have a question about IELTS booking.");
  return (
    <InfoPage
      path="/contact"
      crumb="Contact"
      title="Talk to us"
      lede="WhatsApp is the fastest way to reach us. We reply in English or Nepali."
      cta={false}
    >
      <p>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary !text-white !no-underline"
        >
          Message us on WhatsApp
        </a>
      </p>
      <h2>Other ways to reach us</h2>
      <ul>
        {site.contact_phone && (
          <li>
            Phone: <a href={`tel:${site.contact_phone.replace(/\s/g, "")}`}>{site.contact_phone}</a>
          </li>
        )}
        {site.contact_email && (
          <li>
            Email: <a href={`mailto:${site.contact_email}`}>{site.contact_email}</a>
          </li>
        )}
        {site.office_address && <li>Address: {site.office_address}</li>}
        <li>
          Already have a booking? Quote your reference, like{" "}
          <span className="font-mono">BYI-2026-000123</span>, so we can find it fast.
        </li>
      </ul>
    </InfoPage>
  );
}
