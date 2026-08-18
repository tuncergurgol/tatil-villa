"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  syncVillaRoomFeatureCatalog,
  syncVillaRooms,
} from "@/lib/queries/villa-rooms";
import { applyTatildeyizRoomsToVilla } from "@/lib/tatildeyiz-room-import";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import {
  isDefaultRoomFeature,
  uniqueRoomFeatures,
} from "@/lib/villa-room-features";

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

  const mergedCustomFeatures = uniqueRoomFeatures([
    ...customFeatures,
    ...(newCustomFeature ? [newCustomFeature] : []),
  ]).filter((feature) => !isDefaultRoomFeature(feature));

  const mergedFeatures = uniqueRoomFeatures([
    ...features,
    ...(newCustomFeature ? [newCustomFeature] : []),
  ]);

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
    await syncVillaRoomFeatureCatalog(villaId, mergedCustomFeatures);

    await revalidateVillaRooms(villaId);
    return { success: true };
  } catch {
    return { error: "Oda güncellenemedi" };
  }
}

export async function addVillaRoomCustomFeature(
  villaId: string,
  featureName: string
): Promise<VillaRoomActionState & { customFeatures?: string[] }> {
  await requireAdmin();

  const name = featureName.trim().replace(/\s+/g, " ");
  if (!name) {
    return { error: "Özellik adı gerekli" };
  }
  try {
    const { catalog } = await syncVillaRoomFeatureCatalog(
      villaId,
      isDefaultRoomFeature(name) ? [] : [name]
    );
    return { success: true, customFeatures: catalog };
  } catch {
    return { error: "Özellik eklenemedi" };
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

export async function importVillaRoomsFromTatildeyiz(
  villaId: string
): Promise<VillaRoomActionState & { message?: string }> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { slug: true },
  });

  if (!villa) {
    return { error: "Villa bulunamadı" };
  }

  try {
    const result = await applyTatildeyizRoomsToVilla(prisma, villa.slug, {
      force: true,
    });

    if (result.status === "error") {
      return { error: result.error ?? "Oda içe aktarılamadı" };
    }

    await revalidateVillaRooms(villaId);
    return {
      success: true,
      message:
        result.updatedRoomCount != null
          ? `${result.updatedRoomCount} oda Tatildeyiz'den içe aktarıldı (${result.source})`
          : "Odalar içe aktarıldı",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Oda içe aktarılamadı";
    return { error: message };
  }
}
