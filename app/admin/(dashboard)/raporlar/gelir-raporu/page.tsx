import IncomeReportPage from "@/components/admin/reports/IncomeReportPage";
import { getIncomeReportData } from "@/lib/queries/income-report";

export const dynamic = "force-dynamic";

export default async function GelirRaporuPage() {
  const { facts, missingCommission } = await getIncomeReportData();
  return (
    <IncomeReportPage facts={facts} missingCommission={missingCommission} />
  );
}
