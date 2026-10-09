import "server-only";
import { fetchSite } from "./server-api";
import type { SiteInfo } from "./types";

export const DEFAULT_SITE: SiteInfo = {
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "9779800000000",
  contact_email: "",
  contact_phone: "",
  office_address: "",
  low_seat_threshold: 5,
  announcement: "",
  footer_disclaimer:
    "bookyourielts.com is an independent service. IELTS is jointly owned by the British Council, IDP IELTS and Cambridge University Press & Assessment. We are not affiliated with or endorsed by them.",
};

/** Site settings from the admin panel, with safe defaults if the API is unreachable. */
export async function getSite(): Promise<SiteInfo> {
  return (await fetchSite()) ?? DEFAULT_SITE;
}
