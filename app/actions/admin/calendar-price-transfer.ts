"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import { prisma } from "@/lib/db";
import {
  isExternalIcalSourceName,
  isExternalSyncSlot,
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";
import { syncVillaIcalSource } from "@/lib/villa-ical-import-service";

export type CalendarPriceTransferActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function revalidateTransferPaths(villaId?: string) {
  revalidatePath("/admin/acente/takvim-fiyat-aktarim");
  revalidatePath("/admin/villalar");
  revalidatePath("/admin/konaklama/takvim");
  if (villaId) {
    await revalidateVillaEditPage(villaId);
  }
}

/** Tek villa: manuel iCal kaynakları + Link 1-3 harici sync (takvim + periyot fiyat). */
export async function syncVillaCalendarPriceTransferAction(
  villaId: string
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      name: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      icalSources: {
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!villa) {
    return { error: "Villa bulunamadı" };
  }

  const messages: string[] = [];
  const errors: string[] = [];

  const manualSources = villa.icalSources.filter(
    (source) => !isExternalIcalSourceName(source.name)
  );
  for (const source of manualSources) {
    const result = await syncVillaIcalSource(source.id);
    if (result.ok) messages.push(`iCal: ${result.message}`);
    else errors.push(`iCal: ${result.message}`);
  }

  const slots: Array<{ slot: ExternalSyncSlot; url: string }> = [
    { slot: 1, url: villa.externalSyncUrl1 },
    { slot: 2, url: villa.externalSyncUrl2 },
    { slot: 3, url: villa.externalSyncUrl3 },
  ];

  for (const item of slots) {
    if (!item.url.trim()) continue;
    const result = await syncVillaExternalLinkSlot(villa.id, item.slot);
    if (result.ok) messages.push(`Link ${item.slot}: ${result.message}`);
    else errors.push(`Link ${item.slot}: ${result.message}`);
  }

  await revalidateTransferPaths(villaId);

  if (messages.length === 0 && errors.length === 0) {
    return {
      error:
        "Güncellenecek iCal veya Link kaydı yok. Önce bağlantı ekleyin.",
    };
  }

  if (errors.length > 0 && messages.length === 0) {
    return { error: errors.join(" | ") };
  }

  return {
    success: true,
    message:
      errors.length > 0
        ? `${messages.join(" | ")} — Hatalar: ${errors.join(" | ")}`
        : messages.join(" | "),
  };
}

/** Seçilen villaları sırayla güncelle. */
export async function syncSelectedVillasCalendarPriceTransferAction(
  villaIds: string[]
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const uniqueIds = Array.from(
    new Set(villaIds.map((id) => id.trim()).filter(Boolean))
  );
  if (uniqueIds.length === 0) {
    return { error: "Güncellemek için en az bir villa seçin" };
  }

  let okCount = 0;
  let failCount = 0;
  const failSamples: string[] = [];

  for (const villaId of uniqueIds) {
    const result = await syncVillaCalendarPriceTransferAction(villaId);
    if (result.success) {
      okCount += 1;
    } else {
      failCount += 1;
      if (failSamples.length < 5) {
        failSamples.push(result.error || "Bilinmeyen hata");
      }
    }
  }

  await revalidateTransferPaths();

  if (failCount === 0) {
    return {
      success: true,
      message: `${okCount} villa güncellendi.`,
    };
  }

  return {
    success: okCount > 0,
    message: `${okCount} başarılı, ${failCount} hatalı. ${failSamples.join(" | ")}`,
    error: okCount === 0 ? failSamples.join(" | ") : undefined,
  };
}

/** Birincil (manuel) iCal kaynağını ekle / güncelle. */
export async function upsertPrimaryVillaIcalSourceAction(
  villaId: string,
  url: string,
  sourceId?: string | null
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const trimmed = url.trim();
  if (!trimmed) {
    return { error: "iCal URL gerekli" };
  }

  try {
    new URL(trimmed);
  } catch {
    return { error: "Geçerli bir URL girin" };
  }

  if (sourceId) {
    const existing = await prisma.villaIcalSource.findFirst({
      where: { id: sourceId, villaId },
    });
    if (!existing || isExternalIcalSourceName(existing.name)) {
      return { error: "iCal kaynağı bulunamadı" };
    }

    const updated = await prisma.villaIcalSource.update({
      where: { id: existing.id },
      data: { url: trimmed },
    });
    await syncVillaIcalSource(updated.id);
    await revalidateTransferPaths(villaId);
    return { success: true, message: "iCal bağlantısı güncellendi" };
  }

  const maxOrder = await prisma.villaIcalSource.aggregate({
    where: { villaId },
    _max: { sortOrder: true },
  });

  const created = await prisma.villaIcalSource.create({
    data: {
      villaId,
      name: "iCal",
      url: trimmed,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  await syncVillaIcalSource(created.id);
  await revalidateTransferPaths(villaId);
  return { success: true, message: "iCal bağlantısı eklendi" };
}

export async function deletePrimaryVillaIcalSourceAction(
  villaId: string,
  sourceId: string
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const existing = await prisma.villaIcalSource.findFirst({
    where: { id: sourceId, villaId },
  });
  if (!existing || isExternalIcalSourceName(existing.name)) {
    return { error: "iCal kaynağı bulunamadı" };
  }

  await prisma.villaIcalSource.delete({ where: { id: existing.id } });
  await revalidateTransferPaths(villaId);
  return { success: true, message: "iCal bağlantısı silindi" };
}

export async function saveCalendarPriceTransferLinkAction(
  villaId: string,
  slot: number,
  url: string
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();
  if (!isExternalSyncSlot(slot) || slot > 3) {
    return { error: "Geçersiz link slotu (1-3)" };
  }

  const result = await setVillaExternalSyncUrl(
    villaId,
    slot as ExternalSyncSlot,
    url
  );
  await revalidateTransferPaths(villaId);
  if (!result.ok) return { error: result.message };
  return { success: true, message: result.message };
}

export async function clearCalendarPriceTransferLinkAction(
  villaId: string,
  slot: number
): Promise<CalendarPriceTransferActionResult> {
  return saveCalendarPriceTransferLinkAction(villaId, slot, "");
}
