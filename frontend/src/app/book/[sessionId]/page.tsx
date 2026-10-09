import { notFound } from "next/navigation";
import { BookConfirm } from "@/components/book-confirm";
import { PageHeader } from "@/components/page-header";
import { pageMetadata } from "@/lib/seo";
import { getSite } from "@/lib/site";
import { fetchSession } from "@/lib/server-api";

export const metadata = pageMetadata({
  title: "Confirm your IELTS booking",
  description: "Check your IELTS test details, then book via WhatsApp.",
  path: "/book",
  noindex: true,
});

export default async function BookPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^\d+$/.test(sessionId)) notFound();
  const [session, site] = await Promise.all([fetchSession(sessionId), getSite()]);
  if (!session) notFound();

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "IELTS test dates", path: "/ielts-test-dates" },
          { name: "Confirm booking", path: `/book/${sessionId}` },
        ]}
        title="Check your details, then book on WhatsApp"
      />
      <div className="container-page">
        <BookConfirm session={session} disclaimer={site.footer_disclaimer} />
      </div>
    </>
  );
}
