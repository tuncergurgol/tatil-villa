import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPrepaymentPaymentTypeAdminData } from "@/lib/queries/prepayment-payment-types";
import { getCustomerContactChannelAdminData } from "@/lib/queries/customer-contact-channels";
import CompanySettingsForm from "@/components/admin/company/CompanySettingsForm";

export const dynamic = "force-dynamic";

export default async function SirketPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [settings, prepayment, contactChannels] = await Promise.all([
    getCompanySettings(),
    getPrepaymentPaymentTypeAdminData(),
    getCustomerContactChannelAdminData(),
  ]);

  return (
    <CompanySettingsForm
      settings={settings}
      initialTab={tab}
      prepayment={prepayment}
      contactChannels={contactChannels}
    />
  );
}
