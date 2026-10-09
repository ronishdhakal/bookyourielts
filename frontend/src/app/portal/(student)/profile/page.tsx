import { ProfileForm } from "@/components/portal/portal-home";

export const metadata = { title: "My profile" };

export default function ProfilePage() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">My profile</h1>
      <ProfileForm />
    </>
  );
}
