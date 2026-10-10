import { Suspense } from "react";
import { UsersAdmin } from "@/components/manage/users-admin";

export const metadata = { title: "Users" };

export default function Page() {
  return (
    <Suspense>
      <UsersAdmin />
    </Suspense>
  );
}
