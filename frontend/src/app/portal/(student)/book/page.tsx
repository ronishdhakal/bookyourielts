import { redirect } from "next/navigation";
import { portalHref } from "@/lib/portal";

/** Old booking form links (and the public "Book this date" buttons) land on Find a date with the date open. */
export default async function BookRedirect({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; provider?: string }>;
}) {
  const { session, provider } = await searchParams;
  const sp = new URLSearchParams();
  if (session && /^\d+$/.test(session)) sp.set("session", session);
  if (provider) sp.set("provider", provider);
  const qs = sp.toString();
  redirect(portalHref(`/dates${qs ? `?${qs}` : ""}`));
}
