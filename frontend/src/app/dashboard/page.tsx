import { Dashboard } from "@/components/dashboard";
import { PageHeader } from "@/components/page-header";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "My bookings",
  description: "Your IELTS booking requests and inquiries.",
  path: "/dashboard",
  noindex: true,
});

export default function DashboardPage() {
  return (
    <>
      <PageHeader crumbs={[{ name: "My bookings", path: "/dashboard" }]} title="My bookings" />
      <div className="container-page">
        <Dashboard />
      </div>
    </>
  );
}
