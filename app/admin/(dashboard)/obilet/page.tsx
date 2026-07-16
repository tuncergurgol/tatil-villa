import { requireAdmin } from "@/lib/auth-helpers";
import ObiletSettingsForm from "@/components/admin/obilet/ObiletSettingsForm";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { BILETALL_DEFAULT_PORTAL_SLUG } from "@/lib/biletall";

export const dynamic = "force-dynamic";

export default async function ObiletPage() {
  await requireAdmin();
  const settings = await getCompanySettings();

  return (
    <ObiletSettingsForm
      biletallEnabled={settings.biletallEnabled ?? true}
      biletallPortalSlug={
        settings.biletallPortalSlug?.trim() || BILETALL_DEFAULT_PORTAL_SLUG
      }
    />
  );
}
