import { BookingWizardLoader } from "@/components/portal/booking-wizard";

export const metadata = { title: "Book an exam" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Book an exam</h1>
      <BookingWizardLoader sessionId={session} />
    </>
  );
}
