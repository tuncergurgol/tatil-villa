import BulkWhatsappManagement from "@/components/admin/bulk-whatsapp/BulkWhatsappManagement";
import { getBulkWhatsappPageData } from "@/lib/queries/bulk-whatsapp";

export const dynamic = "force-dynamic";

export default async function TopluMesajPage() {
  const data = await getBulkWhatsappPageData();
  return <BulkWhatsappManagement data={data} />;
}
