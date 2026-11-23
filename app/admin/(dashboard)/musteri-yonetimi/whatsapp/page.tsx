import CustomerWhatsappInbox from "@/components/admin/customer-whatsapp/CustomerWhatsappInbox";
import { requireAdmin } from "@/lib/auth-helpers";
import { listCustomerWhatsappChats } from "@/lib/customer-whatsapp-inbox";
import { listMetaInboxChats } from "@/lib/meta-inbox";

export const dynamic = "force-dynamic";

export default async function CustomerWhatsappPage() {
  await requireAdmin();
  const [initial, meta] = await Promise.all([
    listCustomerWhatsappChats(0),
    listMetaInboxChats(),
  ]);

  return <CustomerWhatsappInbox initial={initial} initialMeta={meta.chats} />;
}
