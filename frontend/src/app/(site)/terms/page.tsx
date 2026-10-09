import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of use",
  description:
    "The terms for using bookyourielts.com, an independent IELTS booking-assistance service in Nepal.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <InfoPage
      path="/terms"
      crumb="Terms of use"
      title="Terms of use"
      lede="Please read these before using the site."
      cta={false}
    >
      <h2>Who we are</h2>
      <p>
        bookyourielts.com is an independent booking-assistance service. We are not the British
        Council, IDP IELTS or Cambridge University Press &amp; Assessment, and we are not affiliated
        with or endorsed by them. IELTS is jointly owned by those organisations.
      </p>

      <h2>What the service does</h2>
      <p>
        We list IELTS test dates, fees and seat availability that our team enters, and we help you
        complete a booking over WhatsApp. The website does not take payments and does not itself
        confirm a seat.
      </p>

      <h2>Booking requests</h2>
      <ul>
        <li>Confirming the booking steps creates a request. It is not a confirmed booking.</li>
        <li>A seat is confirmed only when our team confirms it to you in the chat.</li>
        <li>
          Seat numbers, fees and dates can change. Where they differ from the test provider&apos;s
          records, the provider&apos;s records apply.
        </li>
        <li>Changes, cancellations and refunds follow the rules of the test provider.</li>
      </ul>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Give accurate details. Your name must match the passport you will use on test day.</li>
        <li>
          Keep your password private and tell us if you think your account was used by someone else.
        </li>
        <li>Do not misuse the site, attempt to disrupt it or submit false requests.</li>
      </ul>

      <h2>Information on the site</h2>
      <p>
        Guides on this site are general information, not a guarantee of any score or visa outcome.
        Always confirm test requirements with your university, employer or immigration authority.
      </p>

      <h2>Liability</h2>
      <p>
        We take care to keep the site accurate and available, but we provide it as is. To the extent
        the law allows, we are not liable for losses that arise from relying on the site, such as a
        date that fills before you book.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Nepal.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Visit the <a href="/contact">contact page</a>.
      </p>
    </InfoPage>
  );
}
