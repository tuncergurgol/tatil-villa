import AdminIdleLogout from "@/components/admin/AdminIdleLogout";
import AdminScrollTopButton from "@/components/admin/AdminScrollTopButton";
import OwnerPanelHeader from "@/components/owner/OwnerPanelHeader";
import { requireVillaOwnerSession } from "@/lib/queries/villa-owner-panel";

export const dynamic = "force-dynamic";

export default async function OwnerPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireVillaOwnerSession();

  return (
    <div className="min-h-screen bg-[#eef0f3]">
      <AdminIdleLogout />
      <AdminScrollTopButton />
      <OwnerPanelHeader name={session.user.name ?? "Villa sahibi"} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
