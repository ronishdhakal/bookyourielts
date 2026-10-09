import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Student portal", template: "%s | bookyourielts.com" },
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
