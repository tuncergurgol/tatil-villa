import { Suspense } from "react";
import VillaManagement from "@/components/admin/villas/VillaManagement";
import { getAdminVillaListData } from "@/lib/queries/admin-villas";

export const dynamic = "force-dynamic";

function VillaManagementFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
      Yükleniyor...
    </div>
  );
}

export default async function AdminVillasPage() {
  const { villas, regionTree } = await getAdminVillaListData();

  return (
    <div className="-m-6 min-h-screen lg:-m-8">
      <Suspense fallback={<VillaManagementFallback />}>
        <VillaManagement villas={villas} regionTree={regionTree} />
      </Suspense>
    </div>
  );
}
