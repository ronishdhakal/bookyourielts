import { notFound } from "next/navigation";
import { DateForm } from "@/components/manage/dates-admin";

export const metadata = { title: "Edit test date" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <DateForm id={id} />;
}
