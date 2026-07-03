import PrepaymentPaymentTypeManagement from "@/components/admin/prepayment-payment-types/PrepaymentPaymentTypeManagement";
import { getPrepaymentPaymentTypeAdminData } from "@/lib/queries/prepayment-payment-types";

export const dynamic = "force-dynamic";

export default async function OnOdemeOdemeTipleriPage() {
  const { items, totalCount, activeCount } =
    await getPrepaymentPaymentTypeAdminData();

  return (
    <PrepaymentPaymentTypeManagement
      items={items}
      totalCount={totalCount}
      activeCount={activeCount}
    />
  );
}
