import CrmVillaFeatureImportManagement from "@/components/admin/villas/CrmVillaFeatureImportManagement";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCrmVillaFeatureImportRows } from "@/lib/queries/crm-villa-feature-import";

export const dynamic = "force-dynamic";

export default async function CrmVillaFeatureImportPage() {
  await requireAdmin();
  const rows = await getCrmVillaFeatureImportRows();

  return <CrmVillaFeatureImportManagement rows={rows} />;
}
