import FacebookLeadManagement from "@/components/admin/facebook-leads/FacebookLeadManagement";
import { buildFacebookLeadWebhookUrl } from "@/lib/facebook-lead-labels";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  getFacebookLeadCounts,
  listFacebookLeads,
} from "@/lib/queries/facebook-leads";

export const dynamic = "force-dynamic";

export default async function FacebookLeadPage() {
  await requireAdmin();
  const [leads, counts, settings] = await Promise.all([
    listFacebookLeads(),
    getFacebookLeadCounts(),
    getCompanySettings(),
  ]);

  return (
    <FacebookLeadManagement
      leads={leads}
      counts={counts}
      settings={{
        enabled: settings.facebookLeadEnabled ?? false,
        appId: settings.facebookLeadAppId ?? "",
        appSecret: settings.facebookLeadAppSecret ?? "",
        verifyToken: settings.facebookLeadVerifyToken ?? "",
        pageId: settings.facebookLeadPageId ?? "",
        pageAccessToken: settings.facebookLeadPageAccessToken ?? "",
      }}
      webhookUrl={buildFacebookLeadWebhookUrl()}
    />
  );
}
