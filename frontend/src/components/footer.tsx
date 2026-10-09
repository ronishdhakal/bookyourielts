import Link from "next/link";
import { appHref } from "@/lib/portal";
import { getSite } from "@/lib/site";
import { Logo } from "./logo";

export async function Footer() {
  const site = await getSite();
  return (
    <footer className="on-dark bg-spruce text-board mt-24">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo onDark />
          <p className="text-board/80 mt-4 max-w-xs text-[0.9375rem]">
            We help students in Nepal find IELTS dates and finish their booking.
          </p>
        </div>
        <FooterCol
          title="Book"
          links={[
            ["/ielts-test-dates", "IELTS test dates"],
            ["/ielts-booking-nepal", "IELTS booking in Nepal"],
            ["/inquire", "Send an inquiry"],
            [appHref("/bookings"), "My bookings"],
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            ["/ielts-fee-nepal", "IELTS fee in Nepal"],
            ["/ielts-on-computer-nepal", "IELTS on computer"],
            ["/ielts-academic-vs-general-training", "Academic vs General Training"],
            ["/ielts-test-dates/kathmandu", "IELTS in Kathmandu"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["/about", "About us"],
            ["/contact", "Contact"],
            ["/privacy", "Privacy policy"],
            ["/terms", "Terms of use"],
          ]}
        />
      </div>
      <div className="border-t border-white/15">
        <div className="container-page text-board/75 py-6 text-[0.8125rem] leading-relaxed">
          <p className="max-w-3xl">{site.footer_disclaimer}</p>
          <p className="mt-3">© {new Date().getFullYear()} bookyourielts.com</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-board/70 font-mono text-[0.8125rem] tracking-wide">{title}</h2>
      <ul className="mt-3 space-y-2 text-[0.9375rem]">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="underline-offset-4 hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
