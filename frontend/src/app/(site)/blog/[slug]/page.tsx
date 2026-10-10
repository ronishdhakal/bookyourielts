import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/cta-band";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { PostBody, readingMinutes } from "@/components/post-body";
import { formatDate } from "@/lib/format";
import { articleLd, pageMetadata } from "@/lib/seo";
import { fetchPost, fetchPosts } from "@/lib/server-api";

// Rendered per request (data is cached by the fetch layer). Prerendering at build would bake in
// an empty page, because the API is not reachable while the Docker image is built.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await fetchPost((await params).slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const base = pageMetadata({
    title: post.meta_title || post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
  });
  return {
    ...base,
    authors: [{ name: post.author }],
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
    } as Metadata["openGraph"],
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([fetchPost(slug), fetchPosts()]);
  if (!post) notFound();
  const path = `/blog/${post.slug}`;
  const more = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]}
        eyebrow="Blog"
        title={post.title}
        lede={post.excerpt}
      />
      <article className="container-page">
        <p className="text-muted mb-8 text-sm">
          By {post.author} ·{" "}
          <time dateTime={post.published_at}>{formatDate(post.published_at.slice(0, 10))}</time> ·{" "}
          {readingMinutes(post.body)} min read
          {post.updated_at.slice(0, 10) > post.published_at.slice(0, 10) && (
            <> · Updated {formatDate(post.updated_at.slice(0, 10))}</>
          )}
        </p>
        <PostBody body={post.body} />
        <p className="text-muted mt-10 max-w-2xl text-[0.9375rem]">
          bookyourielts.com is an independent booking-assistance service, not affiliated with the
          British Council or IDP. Ready to book? See the{" "}
          <Link href="/ielts-test-dates" className="text-crimson underline underline-offset-4">
            IELTS test dates in Nepal
          </Link>
          .
        </p>
      </article>

      {more.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="more-posts">
          <h2 id="more-posts" className="text-2xl font-bold md:text-3xl">
            More from the blog
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {more.map((p) => (
              <li key={p.slug} className="panel p-5">
                <h3 className="font-bold">
                  <Link href={`/blog/${p.slug}`} className="hover:underline">
                    {p.title}
                  </Link>
                </h3>
                <p className="text-muted mt-1.5 text-[0.9375rem]">{p.excerpt}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <CtaBand />
      <JsonLd
        data={articleLd({
          path,
          title: post.title,
          description: post.excerpt,
          author: post.author,
          published: post.published_at,
          modified: post.updated_at,
        })}
      />
    </>
  );
}
