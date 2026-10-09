import { Suspense } from "react";
import { InquiriesAdmin } from "@/components/manage/inquiries-admin";

export const metadata = { title: "Inquiries" };

export default function Page() {
  return (
    <Suspense>
      <InquiriesAdmin />
    </Suspense>
  );
}
