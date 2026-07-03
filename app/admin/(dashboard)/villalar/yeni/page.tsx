import Link from "next/link";
import VillaForm from "@/components/admin/VillaForm";
import { getAmenitiesForVillaForm } from "@/lib/queries/amenities";
import { getFacilityCategoriesForPicker } from "@/lib/queries/facility-categories";
import { getMahalleRegionsForSelect } from "@/lib/queries/region-tree";

export default async function NewVillaPage() {
  const [regions, amenityCategories, facilityCategories] = await Promise.all([
    getMahalleRegionsForSelect(),
    getAmenitiesForVillaForm(),
    getFacilityCategoriesForPicker(),
  ]);

  return (
    <div>
      <Link href="/admin/villalar" className="text-sm text-teal-600 hover:underline">
        ← Villalara Dön
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Yeni Villa</h1>
      <div className="mt-6">
        <VillaForm
          regions={regions}
          amenityCategories={amenityCategories}
          facilityCategories={facilityCategories}
        />
      </div>
    </div>
  );
}
