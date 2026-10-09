import { PortalShell } from "@/components/portal/portal-shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
