import Link from "next/link";
import { CtaBand } from "@/components/cta-band";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { fetchPosts } from "@/lib/server-api";

// Rendered per request (data is cached by the fetch layer). Prerendering at build would bake in
// an empty page, because the API is not reachable while the Docker image is built.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "IELTS Blog for Nepal: Guides, Tips & Updates",
  description:
    "Guides and updates for students taking IELTS in Nepal: booking, test dates, fees, formats and preparation, written by the bookyourielts.com team.",
  path: "/blog",
});

export default async function BlogPage() {
  const posts = await fetchPosts();
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Blog", path: "/blog" }]}
        eyebrow="Blog"
        title="IELTS guides and updates for Nepal"
        lede="Practical articles on booking, test dates, fees and formats, from our team."
      />
      <div className="container-page">
        {posts.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug} className="panel flex flex-col p-6">
                <p className="text-muted text-sm">
                  <time dateTime={p.published_at}>{formatDate(p.published_at.slice(0, 10))}</time>
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  <Link href={`/blog/${p.slug}`} className="hover:underline">
                    {p.title}
                  </Link>
                </h2>
                <p className="text-muted mt-2 text-[0.9375rem]">{p.excerpt}</p>
                <Link
                  href={`/blog/${p.slug}`}
                  className="text-crimson mt-auto pt-4 font-semibold underline underline-offset-4"
                  aria-label={`Read: ${p.title}`}
                >
                  Read the article
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel px-6 py-12 text-center">
            <p className="text-xl font-semibold">Articles are coming soon.</p>
            <p className="text-muted mt-1">
              Meanwhile, see the <Link href="/ielts-test-dates">IELTS test dates in Nepal</Link> or
              read <Link href="/ielts-booking-nepal">how to book IELTS</Link>.
            </p>
          </div>
        )}
      </div>
      <CtaBand />
    </>
  );
}
