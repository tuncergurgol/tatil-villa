"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { syncVillaRooms } from "@/lib/queries/villa-rooms";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";

export type VillaRoomActionState = {
  error?: string;
  success?: boolean;
};

async function revalidateVillaRooms(villaId: string) {
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(villaId);
}

export async function updateVillaRoom(
  villaId: string,
  roomId: string,
  formData: FormData
): Promise<VillaRoomActionState> {
  await requireAdmin();

  const roomType = String(formData.get("roomType") ?? "yatak_odasi").trim();
  const name = String(formData.get("name") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const singleBeds = parseInt(String(formData.get("singleBeds") ?? "0"), 10);
  const doubleBeds = parseInt(String(formData.get("doubleBeds") ?? "0"), 10);
  const features = formData
    .getAll("features")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const customFeatures = formData
    .getAll("customFeatures")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const newCustomFeature = String(formData.get("newCustomFeature") ?? "").trim();

  if (!name) {
    return { error: "Oda adı gerekli" };
  }

  const mergedCustomFeatures = Array.from(
    new Set([
      ...customFeatures,
      ...(newCustomFeature ? [newCustomFeature] : []),
    ])
  );

  const mergedFeatures = Array.from(
    new Set([
      ...features,
      ...(newCustomFeature ? [newCustomFeature] : []),
    ])
  );

  try {
    await prisma.villaRoom.update({
      where: { id: roomId, villaId },
      data: {
        roomType,
        name,
        imageUrl,
        singleBeds: Number.isFinite(singleBeds) ? Math.max(0, singleBeds) : 0,
        doubleBeds: Number.isFinite(doubleBeds) ? Math.max(0, doubleBeds) : 0,
        features: mergedFeatures,
        customFeatures: mergedCustomFeatures,
      },
    });

    await revalidateVillaRooms(villaId);
    return { success: true };
  } catch {
    return { error: "Oda güncellenemedi" };
  }
}

export async function ensureVillaRoomsSynced(
  villaId: string
): Promise<VillaRoomActionState> {
  await requireAdmin();
  await syncVillaRooms(villaId);
  await revalidateVillaRooms(villaId);
  return { success: true };
}
