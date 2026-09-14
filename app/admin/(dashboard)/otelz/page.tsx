import { requireAdmin } from "@/lib/auth-helpers";
import OtelzSettingsForm from "@/components/admin/otelz/OtelzSettingsForm";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { OTELZ_DEFAULT_AFFILIATE } from "@/lib/otelz";

export const dynamic = "force-dynamic";

export default async function OtelzAdminPage() {
  await requireAdmin();
  const settings = await getCompanySettings();

  return (
    <OtelzSettingsForm
      otelzEnabled={settings.otelzEnabled ?? true}
      otelzAffiliateTo={
        settings.otelzAffiliateTo?.trim() || OTELZ_DEFAULT_AFFILIATE.to
      }
      otelzAffiliateCid={
        settings.otelzAffiliateCid?.trim() || OTELZ_DEFAULT_AFFILIATE.cid
      }
    />
  );
}
