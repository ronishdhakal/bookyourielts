import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteHref } from "@/lib/portal";

/** Sign-in pages are shared by both hosts, so they carry only a logo and a way back. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-mist border-b">
        <div className="container-page flex h-16 items-center justify-between">
          <a href={siteHref("/")} aria-label="bookyourielts.com home">
            <Logo height={36} />
          </a>
          <a
            href={siteHref("/ielts-test-dates")}
            className="text-[0.9375rem] underline-offset-4 hover:underline"
          >
            Browse test dates
          </a>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="container-page text-muted py-10 text-[0.8125rem]">
        <p className="max-w-2xl">
          bookyourielts.com is an independent service. IELTS is jointly owned by the British
          Council, IDP IELTS and Cambridge University Press &amp; Assessment. We are not affiliated
          with or endorsed by them.
        </p>
        <p className="mt-2">
          <Link href={siteHref("/privacy")} className="underline">
            Privacy
          </Link>
          {" · "}
          <Link href={siteHref("/terms")} className="underline">
            Terms
          </Link>
        </p>
      </footer>
    </>
  );
}
