import LoyaltyProgramManagement from "@/components/admin/loyalty/LoyaltyProgramManagement";
import { getAdminLoyaltyPageData } from "@/lib/queries/admin-loyalty";

export const dynamic = "force-dynamic";

export default async function AdminSadakatPage() {
  const data = await getAdminLoyaltyPageData();
  return <LoyaltyProgramManagement data={data} />;
}
