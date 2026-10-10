import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { TYPE_PAGES } from "@/lib/landing";
import { appHref } from "@/lib/portal";
import { getSite } from "@/lib/site";
import { fetchCities } from "@/lib/server-api";
import { Logo } from "./logo";

export async function Footer() {
  const [site, cities] = await Promise.all([getSite(), fetchCities()]);
  return (
    <footer className="on-dark bg-spruce text-board mt-20">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <Logo onDark />
          <p className="text-board/80 mt-4 max-w-xs text-[0.9375rem]">
            We help students in Nepal find IELTS dates and finish their booking.
          </p>
          <ul className="mt-5 space-y-2 text-[0.9375rem]">
            <li>
              <span className="text-board/60 block text-[0.75rem] tracking-wider uppercase">
                Email
              </span>
              <a
                href="mailto:bookyourielts@gmail.com"
                className="underline-offset-4 hover:underline"
              >
                bookyourielts@gmail.com
              </a>
            </li>
            <li>
              <span className="text-board/60 block text-[0.75rem] tracking-wider uppercase">
                Phone
              </span>
              <a href="tel:+9779860688212" className="underline-offset-4 hover:underline">
                9860688212
              </a>
            </li>
          </ul>
        </div>
        <FooterCol
          title="Book"
          links={[
            ["/ielts-test-dates", "IELTS test dates in Nepal"],
            ["/ielts-booking-nepal", "How to book IELTS in Nepal"],
            ["/ielts-fee-nepal", "IELTS fee in Nepal"],
            ["/inquire", "Send an inquiry"],
            [appHref("/bookings"), "My bookings"],
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            ...TYPE_PAGES.map((t): [string, string] => [t.path, `${t.label} dates`]),
            ["/ielts-on-computer-nepal", "IELTS on computer"],
            ["/ielts-academic-vs-general-training", "Academic vs General Training"],
            ...GUIDES.map((g): [string, string] => [g.path, g.label]),
          ]}
        />
        <FooterCol
          title="IELTS by city"
          links={(cities ?? []).map((c): [string, string] => [
            `/ielts-test-dates/${c.slug}`,
            `IELTS in ${c.name}`,
          ])}
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
      <h2 className="text-board/60 text-[0.75rem] font-semibold tracking-wider uppercase">
        {title}
      </h2>
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
