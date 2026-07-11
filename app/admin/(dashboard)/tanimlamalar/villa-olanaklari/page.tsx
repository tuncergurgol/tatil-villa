import AmenityManagement from "@/components/admin/amenities/AmenityManagement";
import { getAmenityAdminData } from "@/lib/queries/amenities";
import { getFacilityCategoriesForPicker } from "@/lib/queries/facility-categories";

export const dynamic = "force-dynamic";

export default async function VillaOlanaklariPage() {
  const [{ categories, totalAmenities, defaultCount, searchCount }, facilityCategories] =
    await Promise.all([
      getAmenityAdminData(),
      getFacilityCategoriesForPicker(),
    ]);

  return (
    <AmenityManagement
      categories={categories}
      facilityCategories={facilityCategories}
      totalAmenities={totalAmenities}
      defaultCount={defaultCount}
      searchCount={searchCount}
    />
  );
}
