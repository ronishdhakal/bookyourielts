import { Suspense } from "react";
import { FindDates } from "@/components/portal/find-dates";

export const metadata = { title: "Find a date" };

export default function Page() {
  return (
    <Suspense>
      <FindDates />
    </Suspense>
  );
}
