import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingDetail } from "@/components/portal/bookings";
import { portalHref } from "@/lib/portal";

export const metadata = { title: "Booking details" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return (
    <>
      <p className="mb-2 text-[0.9375rem]">
        <Link href={portalHref("/bookings")} className="text-muted underline underline-offset-4">
          ← My bookings
        </Link>
      </p>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Booking details</h1>
      <BookingDetail id={id} />
    </>
  );
}
