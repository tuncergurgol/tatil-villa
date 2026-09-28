import ChartAccountReportPage from "@/components/admin/reports/ChartAccountReportPage";
import { getChartAccountReport } from "@/lib/queries/chart-account-report";

export const dynamic = "force-dynamic";

export default async function HesapPlaniPage() {
  const report = await getChartAccountReport();
  return (
    <ChartAccountReportPage
      customers={report.customers}
      owners={report.owners}
    />
  );
}
