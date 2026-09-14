import InvoiceReportPage from "@/components/admin/reports/InvoiceReportPage";
import { getInvoiceReportListData } from "@/lib/queries/invoice-report";

export const dynamic = "force-dynamic";

export default async function FaturaRaporlariPage() {
  const { items, villas, warnings } = await getInvoiceReportListData();

  return (
    <InvoiceReportPage items={items} villas={villas} warnings={warnings} />
  );
}
