import Link from "next/link";
import { BookingsList } from "@/components/portal/bookings";
import { portalHref } from "@/lib/portal";

export const metadata = { title: "My bookings" };

export default function BookingsPage() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold md:text-4xl">My bookings</h1>
        <Link href={portalHref("/book")} className="btn btn-primary">
          Book an exam
        </Link>
      </div>
      <BookingsList />
    </>
  );
}
