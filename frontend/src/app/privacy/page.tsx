import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description: "How bookyourielts.com collects, uses and protects your personal information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <InfoPage
      path="/privacy"
      crumb="Privacy policy"
      title="Privacy policy"
      lede="What we collect, why, and the choices you have."
      cta={false}
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, mobile number and a password
          (stored only as a secure hash).
        </li>
        <li>
          <strong>Booking requests and inquiries:</strong> the test dates you choose and the details
          you put in an inquiry (city, test type, preferred month, message).
        </li>
        <li>
          <strong>Technical data:</strong> basic request information such as IP address, used to
          protect the site from abuse and to limit repeated requests.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your account and link booking requests to you.</li>
        <li>To prepare the WhatsApp message and to contact you about your booking or inquiry.</li>
        <li>To send account emails such as email verification and password reset.</li>
        <li>To run, secure and improve the service.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>WhatsApp</h2>
      <p>
        When you tap Book via WhatsApp or Continue on WhatsApp, your device opens WhatsApp with a
        prepared message. What you send there is handled by WhatsApp (Meta) under its own terms and
        privacy policy, and by our team.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies the site needs to work: a session cookie that keeps you logged in
        and a security cookie that protects forms. We do not use advertising cookies.
      </p>

      <h2>Sharing</h2>
      <p>
        We share information only with service providers who help us run the site (for example
        hosting and email delivery), and where the law requires it. We do not send your details to
        the test provider unless you ask us to book on your behalf, which we do through the WhatsApp
        conversation with you.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account, booking and inquiry records for as long as needed to provide the service
        and meet legal obligations, then delete or anonymise them.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to correct or delete your information, or close your account, by contacting
        us on the <a href="/contact">contact page</a>.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy we will update this page.</p>
    </InfoPage>
  );
}
