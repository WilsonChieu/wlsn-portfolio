import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between">
      <h1 className="font-display text-3xl font-bold uppercase">Admin</h1>
      <LogoutButton />
    </div>
  );
}
