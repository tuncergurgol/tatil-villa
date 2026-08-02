import VillaFeatureTransferManagement from "@/components/admin/villas/VillaFeatureTransferManagement";
import { requireAdmin } from "@/lib/auth-helpers";
import { getVillaFeatureTransferRows } from "@/lib/queries/villa-feature-transfer";

export const dynamic = "force-dynamic";

export default async function VillaFeatureTransferPage() {
  await requireAdmin();
  const rows = await getVillaFeatureTransferRows();

  return <VillaFeatureTransferManagement rows={rows} />;
}
