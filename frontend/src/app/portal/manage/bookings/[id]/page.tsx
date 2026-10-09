import { notFound } from "next/navigation";
import { BookingAdminDetail } from "@/components/manage/bookings-admin";

export const metadata = { title: "Booking request" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BookingAdminDetail id={id} />;
}
