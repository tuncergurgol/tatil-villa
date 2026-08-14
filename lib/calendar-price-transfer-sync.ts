import { PeriodImportStatus } from "@prisma/client";
import { WhatsappCalendarMessageStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  isExternalIcalSourceName,
  isExternalSyncSlot,
  syncVillaExternalLinkSlot,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";
import { syncVillaIcalSource } from "@/lib/villa-ical-import-service";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import { tryImportVillaPeriodsFromExternalLinks } from "@/lib/villa-period-import-with-fallback";
import {
  scrapedPageIsOccupancyOnly,
  scrapedPageHasReliablePeriods,
} from "@/lib/external-villa-page-import-runner";
import { scrapeExternalVillaPage } from "@/lib/external-villa-page-scrape";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import { normalizeWhatsappGroupId } from "@/lib/whatsapp-calendar-webhook";
import {
  findVillasByWhatsappGroupId,
  resolveWhatsappCalendarTargetVillas,
} from "@/lib/whatsapp-calendar-villas";
import {
  mapIntentToOccupancyMode,
  parseWhatsappCalendarMessage,
} from "@/lib/whatsapp-calendar-parser";

import {
  type CalendarPriceTransferSyncCriteria,
  ALL_CALENDAR_PRICE_TRANSFER_CRITERIA,
} from "@/lib/calendar-price-transfer-auto-sync.types";

export type { CalendarPriceTransferSyncCriteria } from "@/lib/calendar-price-transfer-auto-sync.types";
export { ALL_CALENDAR_PRICE_TRANSFER_CRITERIA } from "@/lib/calendar-price-transfer-auto-sync.types";

async function loadWhatsappCalendarParserRules() {
  const [phraseRules, dateTrainingRules] = await Promise.all([
    prisma.whatsappCalendarPhraseRule.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { phrase: true, intent: true },
    }),
    prisma.whatsappCalendarDateTraining.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        samplePattern: true,
        startDateKey: true,
        endDateKey: true,
        active: true,
      },
    }),
  ]);

  return { phraseRules, dateTrainingRules };
}

async function retryWhatsappCalendarMessage(messageId: string) {
  const message = await prisma.whatsappCalendarMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      body: true,
      groupExternalId: true,
      status: true,
    },
  });

  if (!message || message.status !== WhatsappCalendarMessageStatus.FAILED) {
    return { ok: false, message: "Yeniden denenecek WhatsApp mesajı yok" };
  }

  const groupId = normalizeWhatsappGroupId(message.groupExternalId);
  const linkedVillas = await findVillasByWhatsappGroupId(groupId);
  const { phraseRules, dateTrainingRules } =
    await loadWhatsappCalendarParserRules();

  const recentContext = await prisma.whatsappCalendarMessage.findFirst({
    where: {
      groupExternalId: groupId,
      id: { not: message.id },
      body: { not: "" },
    },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });

  const parsed = parseWhatsappCalendarMessage(
    message.body,
    phraseRules,
    recentContext?.body,
    dateTrainingRules
  );

  const targetVillas = resolveWhatsappCalendarTargetVillas(
    linkedVillas,
    [message.body, recentContext?.body ?? ""].filter(Boolean).join(" ")
  );

  if (targetVillas.length === 0 || !parsed) {
    return { ok: false, message: "WhatsApp mesajı işlenemedi" };
  }

  const mode = mapIntentToOccupancyMode(parsed.intent);
  for (const villa of targetVillas) {
    await applyVillaPeriodDaysOccupancy(
      villa.id,
      parsed.startDateKey,
      parsed.endDateKey,
      mode
    );
  }

  await prisma.whatsappCalendarMessage.update({
    where: { id: message.id },
    data: {
      status: WhatsappCalendarMessageStatus.APPLIED,
      resultMessage: `${targetVillas.length} villa güncellendi`,
      intent: parsed.intent,
      startDate: dateKeyToDbDate(parsed.startDateKey),
      endDate: dateKeyToDbDate(parsed.endDateKey),
    },
  });

  return { ok: true, message: "WhatsApp mesajı işlendi" };
}

async function syncWhatsappForVilla(villaId: string, whatsappGroupId: string) {
  const groupId = normalizeWhatsappGroupId(whatsappGroupId);
  if (!groupId) {
    return { ok: true, message: "WhatsApp bağlantısı yok" };
  }

  const failedMessages = await prisma.whatsappCalendarMessage.findMany({
    where: {
      groupExternalId: groupId,
      status: WhatsappCalendarMessageStatus.FAILED,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true },
  });

  if (failedMessages.length === 0) {
    return { ok: true, message: "WhatsApp: bekleyen hata yok" };
  }

  let okCount = 0;
  const errors: string[] = [];
  for (const item of failedMessages) {
    const result = await retryWhatsappCalendarMessage(item.id);
    if (result.ok) okCount += 1;
    else errors.push(result.message);
  }

  if (okCount > 0) {
    return {
      ok: true,
      message: `WhatsApp: ${okCount} hatalı mesaj yeniden işlendi`,
    };
  }

  return {
    ok: false,
    message: errors[0] ?? "WhatsApp mesajları işlenemedi",
  };
}

export async function runCalendarPriceTransferBatchSync(
  villaId: string,
  criteria: CalendarPriceTransferSyncCriteria = ALL_CALENDAR_PRICE_TRANSFER_CRITERIA
) {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      slug: true,
      name: true,
      whatsappGroupId: true,
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
    return { ok: false, message: "Villa bulunamadı" };
  }

  const messages: string[] = [];
  const errors: string[] = [];

  try {
    const periodResult = await tryImportVillaPeriodsFromExternalLinks(villa.id);
    if (!periodResult) {
      messages.push(
        "Periyot: harici fiyat linki yok (panel fiyatları korunuyor; Airbnb/iCal yalnızca takvim)"
      );
    } else {
      const periodMessage = `${periodResult.sourceLabel}: ${periodResult.periodCount} periyot, ${periodResult.dayCount} gün aktarıldı`;
      messages.push(`Periyot: ${periodMessage}`);
      await prisma.villaPeriodImportLog.upsert({
        where: { villaId: villa.id },
        create: {
          villaId: villa.id,
          sourceSlug: villa.slug,
          status: PeriodImportStatus.SUCCESS,
          message: periodMessage,
          periodCount: periodResult.periodCount,
          dayCount: periodResult.dayCount,
          bookedDays: periodResult.bookedDays,
          optionDays: periodResult.optionDays,
          attemptedAt: new Date(),
          succeededAt: new Date(),
        },
        update: {
          sourceSlug: villa.slug,
          status: PeriodImportStatus.SUCCESS,
          message: periodMessage,
          periodCount: periodResult.periodCount,
          dayCount: periodResult.dayCount,
          bookedDays: periodResult.bookedDays,
          optionDays: periodResult.optionDays,
          attemptedAt: new Date(),
          succeededAt: new Date(),
        },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Periyot aktarımı başarısız";
    errors.push(`Periyot: ${message}`);
    await prisma.villaPeriodImportLog.upsert({
      where: { villaId: villa.id },
      create: {
        villaId: villa.id,
        sourceSlug: villa.slug,
        status: PeriodImportStatus.ERROR,
        message,
        attemptedAt: new Date(),
      },
      update: {
        sourceSlug: villa.slug,
        status: PeriodImportStatus.ERROR,
        message,
        periodCount: 0,
        dayCount: 0,
        bookedDays: 0,
        optionDays: 0,
        attemptedAt: new Date(),
      },
    });
  }

  if (criteria.whatsapp && villa.whatsappGroupId.trim()) {
    const result = await syncWhatsappForVilla(
      villa.id,
      villa.whatsappGroupId
    );
    if (result.ok) messages.push(result.message);
    else errors.push(result.message);
  }

  if (criteria.ical) {
    const manualSources = villa.icalSources.filter(
      (source) => !isExternalIcalSourceName(source.name)
    );
    for (const source of manualSources) {
      const result = await syncVillaIcalSource(source.id);
      if (result.ok) messages.push(`iCal: ${result.message}`);
      else errors.push(`iCal: ${result.message}`);
    }
  }

  const linkSlots: Array<{ enabled: boolean; slot: ExternalSyncSlot; url: string }> =
    [
      { enabled: criteria.link1, slot: 1, url: villa.externalSyncUrl1 },
      { enabled: criteria.link2, slot: 2, url: villa.externalSyncUrl2 },
      { enabled: criteria.link3, slot: 3, url: villa.externalSyncUrl3 },
    ];

  const activeLinks = linkSlots.filter(
    (item) => item.enabled && item.url.trim() && isExternalSyncSlot(item.slot) && item.slot <= 3
  );

  const linkJobs: Array<{
    slot: ExternalSyncSlot;
    url: string;
    occupancyOnly: boolean;
  }> = [];

  for (const item of activeLinks) {
    let occupancyOnly = false;
    try {
      const scraped = await scrapeExternalVillaPage(item.url.trim());
      occupancyOnly =
        scrapedPageIsOccupancyOnly(scraped) ||
        (!scrapedPageHasReliablePeriods(scraped) &&
          scraped.occupancyByDateKey.size > 0);
    } catch {
      occupancyOnly = false;
    }
    linkJobs.push({
      slot: item.slot,
      url: item.url.trim(),
      occupancyOnly,
    });
  }

  linkJobs.sort((a, b) => Number(a.occupancyOnly) - Number(b.occupancyOnly));

  for (const item of linkJobs) {
    const result = await syncVillaExternalLinkSlot(villa.id, item.slot);
    if (result.ok) messages.push(`Link ${item.slot}: ${result.message}`);
    else errors.push(`Link ${item.slot}: ${result.message}`);
  }

  if (messages.length === 0 && errors.length === 0) {
    return {
      ok: false,
      message: "Seçilen kriterlere uygun kaynak bulunamadı",
    };
  }

  if (errors.length > 0 && messages.length === 0) {
    return { ok: false, message: errors.join(" | ") };
  }

  return {
    ok: true,
    message:
      errors.length > 0
        ? `${messages.join(" | ")} — Hatalar: ${errors.join(" | ")}`
        : messages.join(" | "),
  };
}
