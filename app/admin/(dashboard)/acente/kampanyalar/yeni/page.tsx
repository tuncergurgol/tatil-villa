import AgencyCampaignForm from "@/components/admin/campaigns/AgencyCampaignForm";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AgencyCampaignCreatePage() {
  await requireAdmin();
  return <AgencyCampaignForm />;
}
