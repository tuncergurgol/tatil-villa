import CustomerWhatsappInbox from "@/components/admin/customer-whatsapp/CustomerWhatsappInbox";
import { requireAdmin } from "@/lib/auth-helpers";
import { listCustomerWhatsappChats } from "@/lib/customer-whatsapp-inbox";

export const dynamic = "force-dynamic";

export default async function CustomerWhatsappPage() {
  await requireAdmin();
  const initial = await listCustomerWhatsappChats(0);

  return <CustomerWhatsappInbox initial={initial} />;
}
