import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { guide } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { fetchContent } from "@/lib/server-api";

const g = guide("/documents-required-for-ielts-nepal");

export const metadata = pageMetadata({
  title: g.title,
  description: g.description,
  path: g.path,
});

export default async function Page() {
  const blocks = await fetchContent();
  const bring = blocks.find((b) => b.key === "what-to-bring");
  return (
    <InfoPage
      path={g.path}
      crumb="Documents required for IELTS"
      eyebrow="Guide"
      title="Documents required for IELTS in Nepal"
      lede="You need very little on test day, but the passport matters. Here is what to prepare for booking and for the test."
      faqs={[
        {
          question: "Which ID do I need for IELTS in Nepal?",
          answer:
            "Your original passport, the same one you used to register. Photocopies are not accepted.",
        },
        {
          question: "Do I need a passport to book?",
          answer:
            "Enter the candidate's details exactly as on the passport. You can add a passport photo while booking or after, but it is optional.",
        },
        {
          question: "What can I not bring into the test room?",
          answer:
            "Bags, phones, watches and notes are kept outside the test room, so travel light.",
        },
      ]}
      faqTitle="Documents questions"
    >
      <h2>To book your date</h2>
      <p>
        Have the candidate&rsquo;s passport to hand and enter the details exactly as written on it:
        name, date of birth and place of residence. A passport photo is optional while booking and
        can be added later. If you are booking for someone else, such as a child or sibling, you add
        their details and they take the test.
      </p>

      <h2>On test day</h2>
      {bring ? (
        bring.body.split(/\n{2,}/).map((block) =>
          block.split("\n").every((l) => l.startsWith("- ")) ? (
            <ul key={block}>
              {block.split("\n").map((l) => (
                <li key={l}>{l.slice(2)}</li>
              ))}
            </ul>
          ) : (
            <p key={block}>{block}</p>
          ),
        )
      ) : (
        <ul>
          <li>Your original passport, the same one you used to register.</li>
          <li>Your booking confirmation.</li>
        </ul>
      )}

      <h2>Name must match</h2>
      <p>
        The name on your booking must match your passport exactly. If a detail is wrong, tell us as
        early as you can; see{" "}
        <Link href="/ielts-cancellation-refund-nepal">changes and refunds</Link> for how requests
        work.
      </p>

      <p>
        Ready? Pick a date from the <Link href="/ielts-test-dates">IELTS test dates in Nepal</Link>{" "}
        or read <Link href="/ielts-booking-nepal">how to book IELTS in Nepal</Link>.
      </p>
    </InfoPage>
  );
}
