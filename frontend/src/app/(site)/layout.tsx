import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getSite } from "@/lib/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <>
      {site.announcement && (
        <div className="bg-crimson px-4 py-2 text-center text-[0.875rem] font-medium text-white">
          {site.announcement}
        </div>
      )}
      <Header phone={site.contact_phone} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
