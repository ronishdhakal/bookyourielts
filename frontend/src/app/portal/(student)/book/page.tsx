import { BookingWizardLoader } from "@/components/portal/booking-wizard";

export const metadata = { title: "Book an exam" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; provider?: string }>;
}) {
  const { session, provider } = await searchParams;
  return <BookingWizardLoader sessionId={session} provider={provider} />;
}
