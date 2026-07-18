import { getCompanySettings } from "@/lib/queries/company-settings";
import { getAllPublicSiteTracking } from "@/lib/queries/public-site-tracking";
import { getPrepaymentPaymentTypeAdminData } from "@/lib/queries/prepayment-payment-types";
import { getCustomerContactChannelAdminData } from "@/lib/queries/customer-contact-channels";
import { getCompanyBankAccountAdminData } from "@/lib/queries/company-bank-accounts";
import { getAgencySiteAdminData } from "@/lib/queries/agency-sites";
import { getPaymentProviderAdminData } from "@/lib/queries/payment-providers";
import CompanySettingsForm from "@/components/admin/company/CompanySettingsForm";

export const dynamic = "force-dynamic";

export default async function SirketPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [
    settings,
    siteTrackings,
    prepayment,
    contactChannels,
    bankAccounts,
    agencySites,
    paymentProviders,
  ] = await Promise.all([
    getCompanySettings(),
    getAllPublicSiteTracking(),
    getPrepaymentPaymentTypeAdminData(),
    getCustomerContactChannelAdminData(),
    getCompanyBankAccountAdminData(),
    getAgencySiteAdminData(),
    getPaymentProviderAdminData(),
  ]);

  return (
    <CompanySettingsForm
      settings={settings}
      siteTrackings={siteTrackings}
      initialTab={tab}
      prepayment={prepayment}
      contactChannels={contactChannels}
      bankAccounts={bankAccounts}
      agencySites={agencySites}
      paymentProviders={paymentProviders}
    />
  );
}
