import { Breadcrumbs } from "./breadcrumbs";

export function PageHeader({
  title,
  lede,
  crumbs,
  eyebrow,
}: {
  title: string;
  lede?: string;
  crumbs: { name: string; path: string }[];
  eyebrow?: string;
}) {
  return (
    <div className="container-page pt-8 pb-8 md:pt-12 md:pb-10">
      <Breadcrumbs items={crumbs} />
      {eyebrow && <p className="eyebrow mt-8">{eyebrow}</p>}
      <h1 className={`${eyebrow ? "mt-2" : "mt-8"} max-w-3xl text-[2.25rem] font-bold md:text-5xl`}>
        {title}
      </h1>
      {lede && <p className="text-muted mt-5 max-w-2xl text-lg md:text-xl">{lede}</p>}
    </div>
  );
}
