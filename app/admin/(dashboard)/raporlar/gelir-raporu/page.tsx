import IncomeReportPage from "@/components/admin/reports/IncomeReportPage";
import { getIncomeReportFacts } from "@/lib/queries/income-report";

export const dynamic = "force-dynamic";

export default async function GelirRaporuPage() {
  const facts = await getIncomeReportFacts();
  return <IncomeReportPage facts={facts} />;
}
