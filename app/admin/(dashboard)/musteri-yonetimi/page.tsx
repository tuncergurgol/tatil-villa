import CustomerManagement from "@/components/admin/customers/CustomerManagement";
import { getCustomerListData } from "@/lib/queries/customers";

export const dynamic = "force-dynamic";

export default async function MusteriYonetimiPage() {
  const { customers, contactChannels } = await getCustomerListData();

  return (
    <CustomerManagement
      customers={customers}
      contactChannels={contactChannels}
    />
  );
}
