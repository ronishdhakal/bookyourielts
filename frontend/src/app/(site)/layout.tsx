import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getSite } from "@/lib/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <>
      {site.announcement && (
        <div className="bg-marigold text-ink px-4 py-2 text-center text-[0.9375rem] font-medium">
          {site.announcement}
        </div>
      )}
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
