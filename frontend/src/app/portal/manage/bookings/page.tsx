import { Suspense } from "react";
import { BookingsAdmin } from "@/components/manage/bookings-admin";

export const metadata = { title: "Booking requests" };

export default function Page() {
  return (
    <Suspense>
      <BookingsAdmin />
    </Suspense>
  );
}
