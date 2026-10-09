import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Forgot password",
  description: "Reset your bookyourielts.com password.",
  path: "/forgot-password",
  noindex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      lede="Enter your email and we will send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
