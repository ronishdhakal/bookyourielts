import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/auth-forms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Choose a new password",
  description: "Choose a new bookyourielts.com password.",
  path: "/reset-password",
  noindex: true,
});

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string; token?: string }>;
}) {
  const { uid = "", token = "" } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      <ResetPasswordForm uid={uid} token={token} />
    </AuthShell>
  );
}
