import { notFound } from "next/navigation";
import AgencyCampaignForm from "@/components/admin/campaigns/AgencyCampaignForm";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCampaignById } from "@/lib/queries/campaigns";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AgencyCampaignEditPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return <AgencyCampaignForm campaign={campaign} />;
}
