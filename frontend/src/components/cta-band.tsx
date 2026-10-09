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
      <div className="on-dark bg-ink flex flex-col gap-6 rounded-xl px-6 py-9 text-white md:flex-row md:items-center md:justify-between md:px-10">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          <p className="mt-1.5 text-white/75">{text}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/ielts-test-dates" className="btn btn-primary">
            See IELTS test dates
          </Link>
          <Link href="/inquire" className="btn border-white/40 text-white hover:border-white">
            Can&apos;t see your date? Ask us
          </Link>
        </div>
      </div>
    </section>
  );
}
