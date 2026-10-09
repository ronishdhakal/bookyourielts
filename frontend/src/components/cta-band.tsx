import Link from "next/link";

export function CtaBand({
  title = "Ready to pick your date?",
  text = "See open IELTS dates and seats, then book it in a few steps.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="container-page mt-20">
      <div className="border-ink flex flex-col gap-6 border-y-2 py-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-3xl font-extrabold">{title}</h2>
          <p className="text-muted mt-2 text-lg">{text}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/ielts-test-dates" className="btn btn-primary">
            See IELTS test dates
          </Link>
          <Link href="/inquire" className="btn btn-outline">
            Can&apos;t see your date? Ask us
          </Link>
        </div>
      </div>
    </section>
  );
}
