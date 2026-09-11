"use server";

import { revalidatePath } from "next/cache";
import type { PoolMeasureUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  mergeFacilityCategoryNames,
  resolveFacilityCategoryNamesForAmenities,
} from "@/lib/amenity-facility-links";
import {
  amenitiesChanged,
  mergeAmenitiesWithPools,
} from "@/lib/villa-pool-amenities";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";

export type VillaPoolActionState = {
  error?: string;
  success?: boolean;
};

function parseFloatField(value: FormDataEntryValue | null) {
  if (value == null || value === "") return null;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

async function revalidateVillaEdit(villaId: string) {
  await revalidateVillaEditPage(villaId);
  revalidatePath("/admin/villalar");
}

/** Havuz kaydı sonrası Özellikler kutularını havuz tipine / ısıtmaya göre işaretle. */
async function syncVillaAmenitiesFromPools(villaId: string) {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      amenities: true,
      facilityCategories: true,
    },
  });
  if (!villa) return;

  const pools = await prisma.villaPool.findMany({
    where: { villaId },
    select: { poolType: true, heated: true },
  });

  const amenities = mergeAmenitiesWithPools(villa.amenities, pools);
  if (!amenitiesChanged(villa.amenities, amenities)) return;

  const linkedFacilityCategories =
    await resolveFacilityCategoryNamesForAmenities(amenities);
  const facilityCategories = mergeFacilityCategoryNames(
    villa.facilityCategories,
    linkedFacilityCategories
  );

  await prisma.villa.update({
    where: { id: villaId },
    data: { amenities, facilityCategories },
  });
}

export async function createVillaPool(
  formData: FormData
): Promise<VillaPoolActionState> {
  await requireAdmin();

  const villaId = String(formData.get("villaId") ?? "");
  if (!villaId) return { error: "Villa bulunamadı" };

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true },
  });
  if (!villa) return { error: "Villa bulunamadı" };

  const measureUnit = String(formData.get("measureUnit") ?? "M") as PoolMeasureUnit;
  const heated = formData.get("heated") === "true";
  const conservative = formData.get("conservative") === "true";

  const poolCount = await prisma.villaPool.count({ where: { villaId } });

  await prisma.villaPool.create({
    data: {
      villaId,
      measureUnit,
      width: parseFloatField(formData.get("width")),
      length: parseFloatField(formData.get("length")),
      depth: parseFloatField(formData.get("depth")),
      poolType: String(formData.get("poolType") ?? ""),
      purificationMethod: String(formData.get("purificationMethod") ?? ""),
      heated,
      conservative,
      sortOrder: poolCount,
    },
  });

  await syncVillaAmenitiesFromPools(villaId);
  await revalidateVillaEdit(villaId);
  return { success: true };
}

export async function updateVillaPool(
  formData: FormData
): Promise<VillaPoolActionState> {
  await requireAdmin();

  const poolId = String(formData.get("poolId") ?? "");
  const villaId = String(formData.get("villaId") ?? "");
  if (!poolId || !villaId) return { error: "Havuz bulunamadı" };

  const pool = await prisma.villaPool.findFirst({
    where: { id: poolId, villaId },
    select: { id: true },
  });
  if (!pool) return { error: "Havuz bulunamadı" };

  const measureUnit = String(
    formData.get("measureUnit") ?? "M"
  ) as PoolMeasureUnit;
  const heated = formData.get("heated") === "true";
  const conservative = formData.get("conservative") === "true";

  await prisma.villaPool.update({
    where: { id: poolId },
    data: {
      measureUnit,
      width: parseFloatField(formData.get("width")),
      length: parseFloatField(formData.get("length")),
      depth: parseFloatField(formData.get("depth")),
      poolType: String(formData.get("poolType") ?? ""),
      purificationMethod: String(formData.get("purificationMethod") ?? ""),
      heated,
      conservative,
    },
  });

  await syncVillaAmenitiesFromPools(villaId);
  await revalidateVillaEdit(villaId);
  return { success: true };
}

export async function deleteVillaPool(
  poolId: string,
  villaId: string
): Promise<VillaPoolActionState> {
  await requireAdmin();

  const pool = await prisma.villaPool.findFirst({
    where: { id: poolId, villaId },
    select: { id: true },
  });
  if (!pool) return { error: "Havuz bulunamadı" };

  await prisma.villaPool.delete({ where: { id: poolId } });
  await revalidateVillaEdit(villaId);
  return { success: true };
}
