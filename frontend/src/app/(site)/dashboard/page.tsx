import { redirect } from "next/navigation";
import { appHref } from "@/lib/portal";

/** The student area now lives in the portal. */
export default function DashboardRedirect() {
  redirect(appHref("/bookings"));
}
