import VillaContentAiBulkManagement from "@/components/admin/konaklama/VillaContentAiBulkManagement";
import { getVillaContentAiBulkRows } from "@/lib/queries/villa-content-ai-bulk";

export default async function KonaklamaAyarlarPage() {
  const rows = await getVillaContentAiBulkRows();

  return <VillaContentAiBulkManagement rows={rows} />;
}
