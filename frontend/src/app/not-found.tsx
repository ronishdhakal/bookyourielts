import Link from "next/link";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container-page py-20 md:py-28">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 max-w-2xl text-5xl font-extrabold md:text-7xl">
        We could not find that page
      </h1>
      <p className="text-muted mt-5 max-w-lg text-lg">
        The link may be old or mistyped. Try the IELTS test dates, or go back to the home page.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/ielts-test-dates" className="btn btn-primary">
          See IELTS test dates
        </Link>
        <Link href="/" className="btn btn-outline">
          Home page
        </Link>
      </div>
    </div>
  );
}
