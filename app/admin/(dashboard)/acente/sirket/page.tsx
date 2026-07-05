import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPrepaymentPaymentTypeAdminData } from "@/lib/queries/prepayment-payment-types";
import CompanySettingsForm from "@/components/admin/company/CompanySettingsForm";

export const dynamic = "force-dynamic";

export default async function SirketPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [settings, prepayment] = await Promise.all([
    getCompanySettings(),
    getPrepaymentPaymentTypeAdminData(),
  ]);

  return (
    <CompanySettingsForm
      settings={settings}
      initialTab={tab}
      prepayment={prepayment}
    />
  );
}
