import { notFound } from "next/navigation";
import { BookingDetail } from "@/components/portal/bookings";

export const metadata = { title: "Booking details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BookingDetail id={id} />;
}
