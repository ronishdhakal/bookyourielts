import { AuthShell } from "@/components/auth-shell";
import { VerifyEmail } from "@/components/auth-forms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Verify your email",
  description: "Confirm your email address for bookyourielts.com.",
  path: "/verify-email",
  noindex: true,
});

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell title="Verify your email">
      <VerifyEmail token={token} />
    </AuthShell>
  );
}
