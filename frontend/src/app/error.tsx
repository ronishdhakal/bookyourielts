"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page py-20 md:py-28" role="alert">
      <p className="eyebrow">Error 500</p>
      <h1 className="mt-3 max-w-2xl text-5xl font-extrabold md:text-7xl">
        Something went wrong on our side
      </h1>
      <p className="text-muted mt-5 max-w-lg text-lg">
        Please try again. If it keeps happening, contact us and we will help you book.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/contact" className="btn btn-outline">
          Contact us
        </Link>
      </div>
    </div>
  );
}
