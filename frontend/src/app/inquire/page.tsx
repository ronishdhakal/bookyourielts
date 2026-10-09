import { InquiryForm } from "@/components/inquiry-form";
import { PageHeader } from "@/components/page-header";
import { pageMetadata } from "@/lib/seo";
import { fetchCities, fetchTestTypes } from "@/lib/server-api";

export const metadata = pageMetadata({
  title: "Inquire about upcoming IELTS dates",
  description:
    "Can't see an IELTS date for your city? Tell us what you need and we will message you on WhatsApp when a date opens.",
  path: "/inquire",
});

export default async function InquirePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [cities, types] = await Promise.all([fetchCities(), fetchTestTypes()]);
  const cityValid = cities?.some((c) => c.slug === sp.city);
  const typeValid = types?.some((t) => t.code === sp.test_type);
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Inquire", path: "/inquire" }]}
        title="Can't see the date you need?"
        lede="Tell us your city, test type and preferred month. We will message you on WhatsApp as soon as a matching IELTS date opens."
      />
      <div className="container-page">
        <InquiryForm
          cities={cities ?? []}
          types={types ?? []}
          prefill={{
            city: cityValid ? sp.city : undefined,
            test_type: typeValid ? sp.test_type : undefined,
            test_format:
              sp.test_format === "computer" || sp.test_format === "computer_wop"
                ? sp.test_format
                : undefined,
            month: /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") ? sp.month : undefined,
          }}
        />
      </div>
    </>
  );
}
