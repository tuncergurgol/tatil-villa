import Virman340320ReportPage from "@/components/admin/reports/Virman340320ReportPage";
import { getVirman340320Report } from "@/lib/queries/virman-340-320-report";

export const dynamic = "force-dynamic";

export default async function Virman340320Page() {
  const rows = await getVirman340320Report();
  return <Virman340320ReportPage rows={rows} />;
}
