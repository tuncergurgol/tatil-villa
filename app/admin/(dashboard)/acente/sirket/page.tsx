import { getCompanySettings } from "@/lib/queries/company-settings";
import CompanySettingsForm from "@/components/admin/company/CompanySettingsForm";

export const dynamic = "force-dynamic";

export default async function SirketPage() {
  const settings = await getCompanySettings();
  return <CompanySettingsForm settings={settings} />;
}
