import VillaManagement from "@/components/admin/villas/VillaManagement";
import { getAdminVillaListData } from "@/lib/queries/admin-villas";

export const dynamic = "force-dynamic";

export default async function AdminVillasPage() {
  const { villas, regionOptions } = await getAdminVillaListData();

  return <VillaManagement villas={villas} regionOptions={regionOptions} />;
}
