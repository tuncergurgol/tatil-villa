import AgencyMessageTemplateManagement from "@/components/admin/agency-message-templates/AgencyMessageTemplateManagement";
import { getAgencyMessageTemplateAdminData } from "@/lib/queries/agency-message-templates";

export const dynamic = "force-dynamic";

export default async function MesajIcerigiPage() {
  const { items } = await getAgencyMessageTemplateAdminData();

  return <AgencyMessageTemplateManagement items={items} />;
}
