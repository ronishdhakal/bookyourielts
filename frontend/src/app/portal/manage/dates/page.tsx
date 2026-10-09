import { Suspense } from "react";
import { DatesAdmin } from "@/components/manage/dates-admin";

export const metadata = { title: "Test dates" };

export default function Page() {
  return (
    <Suspense>
      <DatesAdmin />
    </Suspense>
  );
}
