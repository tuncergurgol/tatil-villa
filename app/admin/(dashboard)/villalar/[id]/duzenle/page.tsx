import Link from "next/link";
import { notFound } from "next/navigation";
import VillaForm from "@/components/admin/VillaForm";
import { getAmenitiesForVillaForm } from "@/lib/queries/amenities";
import { getFacilityCategoriesForPicker } from "@/lib/queries/facility-categories";
import { getMahalleRegionsForSelect } from "@/lib/queries/region-tree";
import { prisma } from "@/lib/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVillaPage({ params }: PageProps) {
  const { id } = await params;
  const [villa, regions, amenityCategories, facilityCategories] =
    await Promise.all([
      prisma.villa.findUnique({ where: { id } }),
      getMahalleRegionsForSelect(),
      getAmenitiesForVillaForm(),
      getFacilityCategoriesForPicker(),
    ]);

  if (!villa) notFound();

  return (
    <div>
      <Link href="/admin/villalar" className="text-sm text-teal-600 hover:underline">
        ← Villalara Dön
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Villa Düzenle</h1>
      <p className="text-gray-500">{villa.name}</p>
      <div className="mt-6">
        <VillaForm
          regions={regions}
          amenityCategories={amenityCategories}
          facilityCategories={facilityCategories}
          villa={villa}
        />
      </div>
    </div>
  );
}
