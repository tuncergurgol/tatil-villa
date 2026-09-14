import IyzicoPaymentReportPage from "@/components/admin/reports/IyzicoPaymentReportPage";
import { getIyzicoPaymentReportRows } from "@/lib/queries/iyzico-payment-report";

export const dynamic = "force-dynamic";

export default async function IyzicoOdemelerPage() {
  const items = await getIyzicoPaymentReportRows();
  return <IyzicoPaymentReportPage items={items} />;
}
