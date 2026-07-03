import FacilityCategoryManagement from "@/components/admin/facility-categories/FacilityCategoryManagement";
import { getFacilityCategoryAdminData } from "@/lib/queries/facility-categories";

export const dynamic = "force-dynamic";

export default async function VillaKategorileriPage() {
  const { categories, totalCount } = await getFacilityCategoryAdminData();

  return (
    <FacilityCategoryManagement
      categories={categories}
      totalCount={totalCount}
    />
  );
}
