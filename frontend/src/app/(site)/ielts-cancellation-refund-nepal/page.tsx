import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { guide } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { fetchContent } from "@/lib/server-api";

const g = guide("/ielts-cancellation-refund-nepal");

export const metadata = pageMetadata({
  title: g.title,
  description: g.description,
  path: g.path,
});

export default async function Page() {
  const blocks = await fetchContent();
  const refund = blocks.find((b) => b.key === "cancellation-refund");
  return (
    <InfoPage
      path={g.path}
      crumb="IELTS cancellation and refund"
      eyebrow="Guide"
      title="IELTS cancellation, transfer and refund in Nepal"
      lede="Plans change. Here is how a change, cancellation or refund request works when you book through us."
      faqs={[
        {
          question: "Can I change or cancel my IELTS booking?",
          answer:
            "Message us on WhatsApp as early as you can and quote your reference number. Rules on changes and refunds are set by the test provider and depend on how close the test date is.",
        },
        {
          question: "Who decides whether I get a refund?",
          answer:
            "The test provider sets the rules for changes, transfers and refunds. We pass your request on and tell you what is possible for your date.",
        },
        {
          question: "Can I withdraw a request I have not confirmed yet?",
          answer:
            "Yes. In your account you can withdraw a booking request until it is confirmed, and you can ask the team for a change from the booking page.",
        },
      ]}
      faqTitle="Changes and refund questions"
    >
      <h2>Who sets the rules</h2>
      <p>
        The rules for changing a test date, cancelling or getting a refund are set by the IELTS test
        provider, not by bookyourielts.com. They can depend on how close the test date is, which is
        why the earlier you tell us, the more options you usually have.
      </p>
      {refund && refund.body.split(/\n{2,}/).map((p) => <p key={p}>{p}</p>)}

      <h2>How to ask for a change</h2>
      <ol>
        <li>Find your booking reference in your account under My bookings.</li>
        <li>
          Open the booking and send a change request, or message us on WhatsApp and quote the
          reference.
        </li>
        <li>
          Our team checks what the test provider allows for your date and replies with the options.
        </li>
      </ol>

      <h2>Before you book</h2>
      <p>
        Check the <Link href="/ielts-registration-deadline-nepal">registration deadline</Link> and
        the <Link href="/ielts-fee-nepal">IELTS fee in Nepal</Link> for your test, and book the city
        and format you are sure about. If you are not sure yet, you can{" "}
        <Link href="/inquire">send us an inquiry</Link> first.
      </p>
    </InfoPage>
  );
}
