import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About bookyourielts.com",
  description:
    "bookyourielts.com is an independent service that helps students in Nepal find IELTS test dates and complete their booking on WhatsApp.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <InfoPage
      path="/about"
      crumb="About"
      title="We help students in Nepal get an IELTS date, without the back and forth"
      lede="bookyourielts.com is a small, independent booking-assistance service."
    >
      <h2>What we do</h2>
      <p>
        IELTS dates are released in batches and seats go quickly. We keep the open dates, fees and
        seat counts for cities across Nepal in one place, so you can compare them in a minute
        instead of checking several pages. When you choose a date, we help you finish the booking on
        WhatsApp.
      </p>
      <h2>What we are not</h2>
      <p>
        We are <strong>not</strong> the British Council, IDP or Cambridge, and we are not endorsed
        by them. IELTS is jointly owned by the British Council, IDP IELTS and Cambridge University
        Press &amp; Assessment. We do not use their logos and we do not set test dates or fees. We
        list what is available and help you book it.
      </p>
      <h2>How we work</h2>
      <ul>
        <li>
          Our team enters and updates dates, fees and seats by hand, so the schedule reflects real
          availability.
        </li>
        <li>
          You never pay on this website. We explain payment in the WhatsApp chat before you pay
          anything.
        </li>
        <li>A seat is confirmed only when our team confirms it with you.</li>
      </ul>
      <p>
        Questions? <Link href="/contact">Contact us</Link> or{" "}
        <Link href="/ielts-test-dates">browse test dates</Link>.
      </p>
    </InfoPage>
  );
}
