import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  buildVillaWhereForAutoUpdateCriteria,
  clampAutoUpdateInterval,
  criteriaToSyncFlags,
  parseCalendarPriceTransferCriteria,
  type CalendarPriceTransferAutoUpdateSettings,
} from "@/lib/calendar-price-transfer-auto-sync.types";
import { runCalendarPriceTransferBatchSync } from "@/lib/calendar-price-transfer-sync";
import { getAutoUpdateIntervalMs } from "@/lib/calendar-price-transfer-auto-sync.shared";

/** Her cron tetiklemesinde işlenecek villa üst sınırı (toplu scrape süresi). */
const AUTO_UPDATE_BATCH_SIZE = 40;

export type {
  CalendarPriceTransferAutoUpdatePeriod,
  CalendarPriceTransferAutoUpdateSettings,
  CalendarPriceTransferCriterionKey,
  CalendarPriceTransferSyncCriteria,
} from "@/lib/calendar-price-transfer-auto-sync.types";

export {
  CALENDAR_PRICE_TRANSFER_CRITERIA,
  ALL_CALENDAR_PRICE_TRANSFER_CRITERIA,
  buildVillaWhereForAutoUpdateCriteria,
  clampAutoUpdateInterval,
  criteriaToSyncFlags,
  getAutoUpdateIntervalMs,
  parseCalendarPriceTransferCriteria,
  serializeCalendarPriceTransferCriteria,
} from "@/lib/calendar-price-transfer-auto-sync.types";

export { shouldRunCalendarPriceTransferAutoUpdate } from "@/lib/calendar-price-transfer-auto-sync.shared";

export async function getCalendarPriceTransferAutoUpdateSettings(): Promise<CalendarPriceTransferAutoUpdateSettings> {
  const settings = await getCompanySettings();
  const period =
    settings.calendarPriceAutoUpdatePeriod === "day" ? "day" : "hour";

  return {
    enabled: settings.calendarPriceAutoUpdateEnabled,
    period,
    interval: clampAutoUpdateInterval(settings.calendarPriceAutoUpdateInterval),
    criteria: parseCalendarPriceTransferCriteria(
      settings.calendarPriceAutoUpdateCriteriaJson
    ),
    lastRunAt: settings.calendarPriceAutoUpdateLastRunAt,
  };
}

export async function runCalendarPriceTransferAutoUpdate(options?: {
  force?: boolean;
}) {
  const config = await getCalendarPriceTransferAutoUpdateSettings();
  if (!config.enabled && !options?.force) {
    return {
      ok: true,
      skipped: true,
      message: "Otomatik güncelleme kapalı",
    };
  }

  const criteria = criteriaToSyncFlags(config.criteria);
  const criteriaWhere = buildVillaWhereForAutoUpdateCriteria(criteria);
  const intervalMs = getAutoUpdateIntervalMs(config.period, config.interval);
  const dueBefore = options?.force
    ? new Date()
    : new Date(Date.now() - intervalMs);

  const andFilters: Prisma.VillaWhereInput[] = [];
  if (Object.keys(criteriaWhere).length > 0) {
    andFilters.push(criteriaWhere);
  }
  andFilters.push({
    OR: [
      { periodImportLog: { is: null } },
      { periodImportLog: { is: { attemptedAt: { lt: dueBefore } } } },
    ],
  });

  const where: Prisma.VillaWhereInput = {
    active: true,
    AND: andFilters,
  };

  const villas = await prisma.villa.findMany({
    where,
    select: { id: true },
    orderBy: [
      { periodImportLog: { attemptedAt: { sort: "asc", nulls: "first" } } },
      { villaId: "asc" },
    ],
    take: options?.force ? undefined : AUTO_UPDATE_BATCH_SIZE,
  });

  if (villas.length === 0) {
    return {
      ok: true,
      skipped: true,
      message: "Güncellenecek villa yok (seçilen kriterlere uygun villalar güncel)",
    };
  }

  let okCount = 0;
  let failCount = 0;
  const samples: string[] = [];

  for (const villa of villas) {
    const result = await runCalendarPriceTransferBatchSync(villa.id, criteria);
    if (result.ok) okCount += 1;
    else failCount += 1;

    if (!result.ok && samples.length < 5) {
      samples.push(result.message);
    }
  }

  await prisma.companySettings.update({
    where: { id: "default" },
    data: { calendarPriceAutoUpdateLastRunAt: new Date() },
  });

  const batchNote =
    villas.length >= AUTO_UPDATE_BATCH_SIZE && !options?.force
      ? ` (bu turda ${AUTO_UPDATE_BATCH_SIZE} villa; kalanlar sonraki cron'da)`
      : "";

  return {
    ok: failCount === 0,
    skipped: false,
    total: villas.length,
    okCount,
    failCount,
    message:
      failCount > 0
        ? `${okCount} villa güncellendi, ${failCount} hatada sorun oluştu${batchNote}. ${samples.join(" | ")}`
        : `${okCount} villa otomatik güncellendi${batchNote}.`,
  };
}
