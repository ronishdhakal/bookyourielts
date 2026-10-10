import Link from "next/link";
import { SITE_URL, eventsLd } from "@/lib/seo";
import type { Page, SessionFilters, TestSession } from "@/lib/types";
import { JsonLd } from "./json-ld";
import { SessionList } from "./session-list";

export function inquireUrl(filters: SessionFilters): string {
  const sp = new URLSearchParams();
  if (filters.city) sp.set("city", filters.city);
  if (filters.test_type) sp.set("test_type", filters.test_type);
  if (filters.test_format) sp.set("test_format", filters.test_format);
  if (filters.month) sp.set("month", filters.month);
  const qs = sp.toString();
  return qs ? `/inquire?${qs}` : "/inquire";
}

export function EmptyDates({
  filters,
  basePath,
  hasFilters,
}: {
  filters: SessionFilters;
  basePath: string;
  hasFilters: boolean;
}) {
  return (
    <div className="border-mist rounded-md border-2 border-dashed px-6 py-12 text-center">
      <h2 className="text-2xl font-bold md:text-3xl">
        {hasFilters ? "No dates match these filters yet" : "No dates are open right now"}
      </h2>
      <p className="text-muted mx-auto mt-3 max-w-md">
        New IELTS dates are released in batches. Tell us what you need and we will contact you as
        soon as a matching date opens.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href={inquireUrl(filters)} className="btn btn-primary">
          Inquire about upcoming dates
        </Link>
        {hasFilters && (
          <Link href={basePath} className="btn btn-outline">
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}

export function ScheduleResults({
  data,
  filters,
  basePath,
  caption,
  lockedKeys = [],
}: {
  data: Page<TestSession> | null;
  filters: SessionFilters;
  basePath: string;
  caption: string;
  /** Filter keys already implied by basePath (e.g. "city" on a city page); left out of page links. */
  lockedKeys?: (keyof SessionFilters)[];
}) {
  const hasFilters = Object.entries(filters).some(([k, v]) => k !== "page" && v);

  if (!data) {
    return (
      <div role="alert" className="border-crimson rounded-md border-2 px-6 py-10 text-center">
        <h2 className="text-2xl font-bold">We could not load the dates</h2>
        <p className="text-muted mt-2">
          Please refresh the page in a moment. You can also message us and we will send the dates.
        </p>
        <Link href="/contact" className="btn btn-outline mt-5">
          Contact us
        </Link>
      </div>
    );
  }
  if (data.count === 0)
    return <EmptyDates filters={filters} basePath={basePath} hasFilters={hasFilters} />;

  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const pageSize = 24;
  const pages = Math.ceil(data.count / pageSize);
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters))
      if (v && k !== "page" && !lockedKeys.includes(k as keyof SessionFilters)) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div>
      <p className="text-muted mb-3 text-sm" role="status">
        {data.count} {data.count === 1 ? "date" : "dates"}
        {pages > 1 && ` · page ${page} of ${pages}`}
      </p>
      <SessionList sessions={data.results} caption={caption} />
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={href(page - 1)} className="btn btn-outline btn-sm" rel="prev">
              Earlier dates
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={href(page + 1)} className="btn btn-outline btn-sm" rel="next">
              Later dates
            </Link>
          )}
        </nav>
      )}
      <JsonLd data={eventsLd(data.results.slice(0, 10), `${SITE_URL}${basePath}`)} />
    </div>
  );
}

export function SpeakingExplainer() {
  return (
    <aside
      className="border-mist bg-white-ish border-l-marigold rounded-md border-l-4 px-5 py-4 text-[0.9375rem]"
      aria-label="How the test day works"
    >
      <p>
        <strong>Good to know:</strong> Listening, Reading and Writing happen on the date you pick.
        The <strong>Speaking test is a separate slot</strong>, usually within about 7 days before or
        after. You get your Speaking time once your booking is confirmed. Registration usually
        closes 6 days before the test.
      </p>
    </aside>
  );
}
