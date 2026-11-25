import DocumentCheckPage from "@/components/admin/reports/DocumentCheckPage";
import { getKonutBelgeCheckRows } from "@/lib/queries/konut-belge-check";

export const dynamic = "force-dynamic";

export default async function BelgeKontrolPage() {
  const initialRows = await getKonutBelgeCheckRows();
  return <DocumentCheckPage initialRows={initialRows} />;
}
