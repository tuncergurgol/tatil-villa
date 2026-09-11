import { requireAdmin } from "@/lib/auth-helpers";
import Yolcu360SettingsForm from "@/components/admin/yolcu360/Yolcu360SettingsForm";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";

export const dynamic = "force-dynamic";

export default async function Yolcu360AdminPage() {
  await requireAdmin();
  const settings = await getYolcu360Settings();

  return (
    <Yolcu360SettingsForm
      settings={{
        enabled: settings.enabled,
        publicEnabled: settings.publicEnabled,
        environment: settings.environment,
        apiKey: settings.apiKey,
        hasApiSecret: Boolean(settings.apiSecret?.trim()),
        commissionType: settings.commissionType,
        commissionPercentage: settings.commissionPercentage,
        defaultPaymentType: settings.defaultPaymentType,
      }}
    />
  );
}
