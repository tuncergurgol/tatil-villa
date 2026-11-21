import IyzicoTahsilatReportPage from "@/components/admin/reports/IyzicoTahsilatReportPage";
import { getIyzicoTahsilatReport } from "@/lib/queries/iyzico-tahsilat-report";

export const dynamic = "force-dynamic";

export default async function IyzicoTahsilatPage() {
  const rows = await getIyzicoTahsilatReport();
  return <IyzicoTahsilatReportPage rows={rows} />;
}
