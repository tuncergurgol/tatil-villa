"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import { prisma } from "@/lib/db";
import {
  isExternalIcalSourceName,
  isExternalSyncSlot,
  setVillaExternalSyncUrl,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";
import { syncVillaIcalSource } from "@/lib/villa-ical-import-service";
import {
  ALL_CALENDAR_PRICE_TRANSFER_CRITERIA,
  runCalendarPriceTransferBatchSync,
} from "@/lib/calendar-price-transfer-sync";
import { getCalendarPriceTransferAutoUpdateSettings } from "@/lib/calendar-price-transfer-auto-sync";
import {
  clampAutoUpdateInterval,
  serializeCalendarPriceTransferCriteria,
  type CalendarPriceTransferAutoUpdatePeriod,
  type CalendarPriceTransferCriterionKey,
} from "@/lib/calendar-price-transfer-auto-sync.types";
import { updateCompanySettings } from "@/lib/queries/company-settings";
import { normalizeWhatsappGroupId } from "@/lib/whatsapp-calendar-webhook";

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

/** Tek villa: seçili kaynaklara göre takvim + periyot fiyat güncellemesi. */
export async function syncVillaCalendarPriceTransferAction(
  villaId: string
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const result = await runCalendarPriceTransferBatchSync(
    villaId,
    ALL_CALENDAR_PRICE_TRANSFER_CRITERIA
  );
  await revalidateTransferPaths(villaId);

  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true, message: result.message };
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

export async function saveCalendarPriceTransferWhatsappAction(
  villaId: string,
  input: {
    groupId: string;
    groupName?: string;
    differentName?: boolean;
  }
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const whatsappGroupId = normalizeWhatsappGroupId(input.groupId.trim());
  if (!whatsappGroupId) {
    return { error: "Lütfen bir WhatsApp grubu seçin veya grup ID girin" };
  }

  const whatsappGroupName = (input.groupName ?? "").trim();
  const whatsappGroupDifferentName = Boolean(input.differentName);

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

  await revalidateTransferPaths(villaId);
  return { success: true, message: "WhatsApp grubu eşleştirildi" };
}

export async function clearCalendarPriceTransferWhatsappAction(
  villaId: string
): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  await prisma.villa.update({
    where: { id: villaId },
    data: {
      whatsappGroupId: "",
      whatsappGroupDifferentName: false,
    },
  });

  await revalidateTransferPaths(villaId);
  return { success: true, message: "WhatsApp eşleştirmesi kaldırıldı" };
}

export async function saveCalendarPriceTransferAutoUpdateAction(input: {
  enabled: boolean;
  period: CalendarPriceTransferAutoUpdatePeriod;
  interval: number;
  criteria: CalendarPriceTransferCriterionKey[];
}): Promise<CalendarPriceTransferActionResult> {
  await requireAdmin();

  const criteria = input.criteria.filter((item) =>
    ["whatsapp", "ical", "link1", "link2", "link3"].includes(item)
  );

  if (input.enabled && criteria.length === 0) {
    return { error: "En az bir güncelleme kriteri seçin" };
  }

  await updateCompanySettings({
    calendarPriceAutoUpdateEnabled: input.enabled,
    calendarPriceAutoUpdatePeriod: input.period === "day" ? "day" : "hour",
    calendarPriceAutoUpdateInterval: clampAutoUpdateInterval(input.interval),
    calendarPriceAutoUpdateCriteriaJson:
      serializeCalendarPriceTransferCriteria(criteria),
  });

  await revalidateTransferPaths();
  return {
    success: true,
    message: input.enabled
      ? "Otomatik güncelleme ayarları kaydedildi"
      : "Otomatik güncelleme kapatıldı",
  };
}

export async function getCalendarPriceTransferAutoUpdateAction() {
  await requireAdmin();
  return getCalendarPriceTransferAutoUpdateSettings();
}
