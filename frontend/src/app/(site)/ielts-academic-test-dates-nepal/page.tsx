import { TypeLandingPage, typeMetadata } from "@/components/type-landing";
import { getTypePage } from "@/lib/landing";

const t = getTypePage("/ielts-academic-test-dates-nepal");
type SP = Promise<Record<string, string | string[] | undefined>>;

export const generateMetadata = async ({ searchParams }: { searchParams: SP }) =>
  typeMetadata(t, await searchParams);

export default async function Page({ searchParams }: { searchParams: SP }) {
  return <TypeLandingPage t={t} sp={await searchParams} />;
}
