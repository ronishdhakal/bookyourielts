import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";
import { fetchContent, fetchFaqs } from "@/lib/server-api";

// Rendered per request (data is cached by the fetch layer). Prerendering at build would bake in
// an empty page, because the API is not reachable while the Docker image is built.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "IELTS on Computer in Nepal: Format, Results & Booking",
  description:
    "How IELTS on computer works in Nepal, how it differs from Writing on Paper, how fast results arrive, and how to book a computer-delivered IELTS date.",
  path: "/ielts-on-computer-nepal",
});

export default async function ComputerPage() {
  const [faqs, blocks] = await Promise.all([fetchFaqs("computer"), fetchContent()]);
  const testDay = blocks.find((b) => b.key === "test-day");
  const bring = blocks.find((b) => b.key === "what-to-bring");

  return (
    <InfoPage
      path="/ielts-on-computer-nepal"
      crumb="IELTS on computer"
      eyebrow="Test formats"
      title="IELTS on computer in Nepal"
      lede="The same IELTS, taken on a computer. Here is what changes, what stays the same, and which format to book."
      faqs={faqs}
      faqTitle="IELTS on computer questions"
    >
      <h2>Two formats in Nepal</h2>
      <h3>Computer-delivered IELTS</h3>
      <p>
        You take Listening, Reading and Writing on a computer and type your Writing answers. The
        questions, timing and scoring are the same as the paper test. The Speaking test is still a
        live, face-to-face conversation with an examiner. This is the standard format and is
        available for Academic, General Training and UKVI.
      </p>
      <h3>Computer-delivered with Writing on Paper</h3>
      <p>
        You take Listening and Reading on the computer but handwrite your Writing answers. It suits
        students who write faster by hand. It is offered at fewer centres and is{" "}
        <strong>not available for UKVI</strong>.
      </p>

      <h2>Why many students choose computer</h2>
      <ul>
        <li>
          <strong>Faster results.</strong> Computer-delivered results usually arrive in about three
          to five days. Writing on Paper usually takes around thirteen days.
        </li>
        <li>
          <strong>More choice of dates.</strong> Computer sessions often have more dates on offer,
          so it can be easier to find a date that fits your application deadline.
        </li>
        <li>
          <strong>Typing is quicker for some.</strong> If you type comfortably, you can edit, move
          and count words easily.
        </li>
      </ul>

      <h2>Tips if you have never done it on a screen</h2>
      <ul>
        <li>Practise typing Writing answers under time pressure, including Task 1 and Task 2.</li>
        <li>
          Practise reading long texts on a screen, and learn how to highlight and take notes on it.
        </li>
        <li>Use headphones for Listening practice. You will wear headphones in the test.</li>
        <li>Arrive early so the check-in does not eat into your focus.</li>
      </ul>

      {testDay && (
        <>
          <h2>{testDay.title}</h2>
          {testDay.body.split(/\n{2,}/).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </>
      )}
      {bring && (
        <>
          <h2>{bring.title}</h2>
          {bring.body.split(/\n{2,}/).map((p) =>
            p.startsWith("- ") ? (
              <ul key={p}>
                {p.split("\n").map((li) => (
                  <li key={li}>{li.replace(/^- /, "")}</li>
                ))}
              </ul>
            ) : (
              <p key={p}>{p}</p>
            ),
          )}
        </>
      )}

      <p>
        See open dates:{" "}
        <Link href="/ielts-test-dates?test_format=computer">computer-delivered</Link> or{" "}
        <Link href="/ielts-test-dates?test_format=computer_wop">with Writing on Paper</Link>.
      </p>
    </InfoPage>
  );
}
