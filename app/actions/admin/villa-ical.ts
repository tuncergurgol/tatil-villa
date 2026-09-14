"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import { normalizeWhatsappGroupId } from "@/lib/whatsapp-calendar-webhook";
import {
  syncVillaIcalSource,
  syncVillaIcalSourcesForVilla,
} from "@/lib/villa-ical-import-service";

async function revalidateVillaIcal(villaId: string) {
  revalidatePath("/admin/villalar");
  revalidatePath("/admin/acente/evolution-whatsapp");
  await revalidateVillaEditPage(villaId);
}

export type VillaIcalActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function createVillaIcalSource(
  villaId: string,
  formData: FormData
): Promise<VillaIcalActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!name || !url) {
    return { error: "Kaynak adı ve URL gerekli" };
  }

  const maxOrder = await prisma.villaIcalSource.aggregate({
    where: { villaId },
    _max: { sortOrder: true },
  });

  try {
    const created = await prisma.villaIcalSource.create({
      data: {
        villaId,
        name,
        url,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });

    await syncVillaIcalSource(created.id);

    await prisma.villaIcalSyncEvent.create({
      data: {
        villaId,
        message: `Yeni iCal kaynağı eklendi: ${name}`,
      },
    });

    await revalidateVillaIcal(villaId);
    return { success: true };
  } catch {
    return { error: "Kaynak eklenemedi" };
  }
}

export async function deleteVillaIcalSource(
  villaId: string,
  sourceId: string
): Promise<VillaIcalActionState> {
  await requireAdmin();

  try {
    await prisma.villaIcalSource.delete({
      where: { id: sourceId, villaId },
    });

    await revalidateVillaIcal(villaId);
    return { success: true };
  } catch {
    return { error: "Kaynak silinemedi" };
  }
}

export async function clearVillaIcalData(
  villaId: string
): Promise<VillaIcalActionState> {
  await requireAdmin();

  await prisma.$transaction([
    prisma.villaIcalSource.deleteMany({ where: { villaId } }),
    prisma.villaIcalSyncEvent.deleteMany({ where: { villaId } }),
    prisma.villaIcalSyncEvent.create({
      data: {
        villaId,
        message: "iCal verileri temizlendi",
      },
    }),
  ]);

  await revalidateVillaIcal(villaId);
  return { success: true };
}

export async function rotateVillaIcalExportUrl(
  villaId: string
): Promise<VillaIcalActionState> {
  await requireAdmin();

  const token = randomUUID();

  await prisma.$transaction([
    prisma.villa.update({
      where: { id: villaId },
      data: { icalExportToken: token },
    }),
    prisma.villaIcalSyncEvent.create({
      data: {
        villaId,
        message: "Giden iCal URL yenilendi",
      },
    }),
  ]);

  await revalidateVillaIcal(villaId);
  return { success: true };
}

export async function matchVillaWhatsappGroup(
  villaId: string,
  formData: FormData
): Promise<VillaIcalActionState> {
  await requireAdmin();

  const whatsappGroupId = normalizeWhatsappGroupId(
    String(formData.get("whatsappGroupId") ?? "").trim()
  );
  const whatsappGroupDifferentName =
    formData.get("whatsappGroupDifferentName") === "on";
  const whatsappGroupName = String(formData.get("whatsappGroupName") ?? "").trim();

  if (!whatsappGroupId) {
    return { error: "Lütfen bir WhatsApp grubu seçin veya grup ID girin" };
  }

  await prisma.$transaction(async (tx) => {
    if (whatsappGroupName) {
      await tx.whatsappCalendarGroup.upsert({
        where: { externalId: whatsappGroupId },
        create: {
          externalId: whatsappGroupId,
          name: whatsappGroupName,
        },
        update: {
          name: whatsappGroupName,
        },
      });
    }

    await tx.villa.update({
      where: { id: villaId },
      data: {
        whatsappGroupId,
        whatsappGroupDifferentName,
      },
    });
  });

  await revalidateVillaIcal(villaId);
  return { success: true };
}

export async function syncSingleVillaIcalSourceAction(
  villaId: string,
  sourceId: string
): Promise<VillaIcalActionState> {
  await requireAdmin();

  const source = await prisma.villaIcalSource.findFirst({
    where: { id: sourceId, villaId },
    select: { id: true },
  });

  if (!source) {
    return { error: "Kaynak bulunamadı" };
  }

  const result = await syncVillaIcalSource(source.id);
  await revalidateVillaIcal(villaId);

  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true, message: result.message };
}

export async function syncVillaIcalSourcesAction(
  villaId: string
): Promise<VillaIcalActionState> {
  await requireAdmin();

  const results = await syncVillaIcalSourcesForVilla(villaId);
  await revalidateVillaIcal(villaId);

  const failed = results.filter((item) => !item.ok);
  if (failed.length > 0) {
    return {
      error: `${failed.length} kaynak senkronlanamadı: ${failed[0]?.message ?? ""}`,
    };
  }

  return {
    success: true,
    message: `${results.length} kaynak senkronlandı`,
  };
}
