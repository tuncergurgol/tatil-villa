import AgencyCampaignManagement from "@/components/admin/campaigns/AgencyCampaignManagement";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCampaignAdminData } from "@/lib/queries/campaigns";

export const dynamic = "force-dynamic";

export default async function AgencyCampaignsPage() {
  await requireAdmin();
  const data = await getCampaignAdminData();

  return <AgencyCampaignManagement {...data} />;
}
