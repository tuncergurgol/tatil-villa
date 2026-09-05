import OwnerPaymentReportPage from "@/components/admin/reports/OwnerPaymentReportPage";
import { getOwnerPaymentReportListData } from "@/lib/queries/owner-payment-report";

export const dynamic = "force-dynamic";

export default async function EvSahibiOdemeleriPage() {
  const { items, villas, warnings } = await getOwnerPaymentReportListData();

  return (
    <OwnerPaymentReportPage
      items={items}
      villas={villas}
      warnings={warnings}
    />
  );
}
