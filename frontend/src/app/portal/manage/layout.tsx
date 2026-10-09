import type { Metadata } from "next";
import { ManageShell } from "@/components/manage/manage-shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" } };

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <ManageShell>{children}</ManageShell>;
}
