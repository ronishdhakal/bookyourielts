import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/nav";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Create an account",
  description: "Create a free account to book IELTS test dates in Nepal.",
  path: "/register",
  noindex: true,
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell
      title="Create your account"
      lede="It takes a minute. We will take you straight back to your booking."
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
