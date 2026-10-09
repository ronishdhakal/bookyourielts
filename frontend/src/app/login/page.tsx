import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/nav";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Log in",
  description: "Log in to book IELTS test dates.",
  path: "/login",
  noindex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Log in" lede="Welcome back. Log in to continue your booking.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
