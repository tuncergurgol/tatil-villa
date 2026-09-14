"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  mergeFacilityCategoryNames,
  resolveFacilityCategoryNamesForAmenities,
} from "@/lib/amenity-facility-links";
import { prisma } from "@/lib/db";
import {
  getAmenitiesForVillaForm,
  getDefaultAmenityNames,
} from "@/lib/queries/amenities";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";

export type VillaFeatureTransferActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function applyDefaultVillaFeaturesAction(
  villaId: string
): Promise<VillaFeatureTransferActionState> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, name: true },
  });
  if (!villa) return { error: "Villa bulunamadı" };

  const categories = await getAmenitiesForVillaForm();
  const defaultAmenityNames = getDefaultAmenityNames(categories);
  if (defaultAmenityNames.length === 0) {
    return { error: "Varsayılan özellik tanımı bulunamadı" };
  }

  const linkedFacilityCategories =
    await resolveFacilityCategoryNamesForAmenities(defaultAmenityNames);
  const facilityCategories = mergeFacilityCategoryNames(
    [],
    linkedFacilityCategories
  );

  await prisma.villa.update({
    where: { id: villaId },
    data: {
      amenities: defaultAmenityNames,
      facilityCategories,
    },
  });

  await revalidateVillaEditPage(villaId);
  revalidatePath("/admin/konaklama/ayarlar/ozellikleri-aktar");

  return {
    success: true,
    message: `${villa.name} için ${defaultAmenityNames.length} varsayılan özellik uygulandı.`,
  };
}
