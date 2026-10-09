import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";
import { fetchFaqs } from "@/lib/server-api";

export const metadata = pageMetadata({
  title: "IELTS Academic vs General Training: Which Should You Take?",
  description:
    "IELTS Academic or General Training in Nepal? Learn the differences in Reading and Writing, who needs which test, and how to choose before you book.",
  path: "/ielts-academic-vs-general-training",
});

export default async function ModulesPage() {
  const faqs = await fetchFaqs("modules");
  return (
    <InfoPage
      path="/ielts-academic-vs-general-training"
      crumb="Academic vs General Training"
      eyebrow="Choosing your test"
      title="IELTS Academic or General Training: which one do you need?"
      lede="Both tests are scored from 0 to 9 and share the same Listening and Speaking. The difference is in Reading and Writing, and in who accepts the result."
      faqs={faqs}
      faqTitle="Academic and General Training questions"
    >
      <h2>The short answer</h2>
      <ul>
        <li>
          Going to a <strong>university</strong> or registering for a profession like nursing or
          medicine? Take <strong>Academic</strong>.
        </li>
        <li>
          Applying for <strong>work, training or migration</strong> to countries such as Canada,
          Australia or New Zealand? Usually <strong>General Training</strong>.
        </li>
        <li>
          Always confirm with your university, employer or immigration authority. They decide which
          test they accept.
        </li>
      </ul>

      <h2>What is different</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Part</th>
            <th scope="col">Academic</th>
            <th scope="col">General Training</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Listening</th>
            <td colSpan={2}>Same for both. About 30 minutes, four recordings.</td>
          </tr>
          <tr>
            <th scope="row">Reading</th>
            <td>
              Three long texts from books, journals and newspapers, written for a general audience
              but academic in style.
            </td>
            <td>
              Short texts from everyday life and work, like notices, adverts and workplace
              documents, plus a longer text.
            </td>
          </tr>
          <tr>
            <th scope="row">Writing Task 1</th>
            <td>Describe a graph, chart, table or diagram in your own words.</td>
            <td>Write a letter, such as a request or a complaint.</td>
          </tr>
          <tr>
            <th scope="row">Writing Task 2</th>
            <td colSpan={2}>
              An essay responding to a point of view or problem. Similar for both.
            </td>
          </tr>
          <tr>
            <th scope="row">Speaking</th>
            <td colSpan={2}>
              Same for both. An 11 to 14 minute face-to-face conversation with an examiner.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>What about UKVI and Life Skills?</h2>
      <p>
        IELTS UKVI comes in Academic and General Training versions. The content is the same; the
        test is delivered under UK Visas and Immigration conditions and is only for certain UK visa
        routes. IELTS Life Skills tests Speaking and Listening only. If your visa guidance names one
        of these, book exactly that test, because a standard IELTS result will not be accepted in
        its place.
      </p>

      <h2>Can I switch after booking?</h2>
      <p>
        Changing your test type after booking depends on the test provider&apos;s rules and how
        close the test date is. If you are unsure, ask before you book, not after.
      </p>

      <p>
        Ready? See open <Link href="/ielts-test-dates?test_type=academic">Academic dates</Link> or{" "}
        <Link href="/ielts-test-dates?test_type=general-training">General Training dates</Link>.
      </p>
    </InfoPage>
  );
}
