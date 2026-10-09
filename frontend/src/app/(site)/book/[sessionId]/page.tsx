import { notFound, redirect } from "next/navigation";
import { appHref } from "@/lib/portal";

/** Old confirm link: send the student to the booking steps with this date preselected. */
export default async function BookRedirect({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^\d+$/.test(sessionId)) notFound();
  redirect(appHref(`/book?session=${sessionId}`));
}
