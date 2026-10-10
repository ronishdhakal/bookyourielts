import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { guide } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { fetchCities } from "@/lib/server-api";

const g = guide("/ielts-test-centres-nepal");

export const metadata = pageMetadata({
  title: g.title,
  description: g.description,
  path: g.path,
});

export default async function Page() {
  const cities = (await fetchCities()) ?? [];
  const withDates = cities.filter((c) => c.upcoming_count > 0);
  return (
    <InfoPage
      path={g.path}
      crumb="IELTS test cities"
      eyebrow="Guide"
      title="IELTS test centres and cities in Nepal"
      lede="IELTS is held in several cities across Nepal. Here is where, and which cities have open dates right now."
      faqs={[
        {
          question: "How do I know the exact test venue?",
          answer:
            "Only the city is fixed on a date. Your session (morning or afternoon) and the test venue are confirmed by our team after you book.",
        },
        {
          question: "What if my city has no date?",
          answer:
            "Send us an inquiry with your city, test type and preferred month, and we will message you when a date opens. You can also look at a city that has open dates.",
        },
      ]}
      faqTitle="Test city questions"
    >
      <p>
        {cities.length > 0
          ? `IELTS is held in ${cities.length} cities in Nepal: ${cities.map((c) => c.name).join(", ")}. `
          : "IELTS is held in several cities across Nepal. "}
        {withDates.length > 0
          ? `Right now ${withDates.length === 1 ? "one city has" : `${withDates.length} cities have`} open dates: ${withDates.map((c) => c.name).join(", ")}.`
          : "No city has open dates right now."}
      </p>

      <h2>IELTS test dates by city</h2>
      <ul>
        {cities.map((c) => (
          <li key={c.slug}>
            <Link href={`/ielts-test-dates/${c.slug}`}>IELTS test dates in {c.name}</Link>
            {c.upcoming_count > 0
              ? ` (${c.upcoming_count} open ${c.upcoming_count === 1 ? "date" : "dates"})`
              : " (no open dates yet)"}
          </li>
        ))}
      </ul>

      <h2>How the venue is decided</h2>
      <p>
        When you book, you choose a city and a date. The session time and the exact test venue are
        confirmed by our team after your booking, and you are told before test day. Bring your
        original passport; see the{" "}
        <Link href="/documents-required-for-ielts-nepal">documents you need for IELTS</Link>.
      </p>

      <p>
        Comparing options? See all <Link href="/ielts-test-dates">IELTS dates in Nepal</Link> or the{" "}
        <Link href="/ielts-fee-nepal">IELTS fee in Nepal</Link>.
      </p>
    </InfoPage>
  );
}
