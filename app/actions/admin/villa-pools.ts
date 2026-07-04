"use server";

import { revalidatePath } from "next/cache";
import type { PoolMeasureUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
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
