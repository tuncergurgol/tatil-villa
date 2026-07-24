import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  clampAutoUpdateInterval,
  criteriaToSyncFlags,
  parseCalendarPriceTransferCriteria,
  type CalendarPriceTransferAutoUpdateSettings,
} from "@/lib/calendar-price-transfer-auto-sync.types";
import { runCalendarPriceTransferBatchSync } from "@/lib/calendar-price-transfer-sync";
import {
  getAutoUpdateIntervalMs,
  shouldRunCalendarPriceTransferAutoUpdate,
} from "@/lib/calendar-price-transfer-auto-sync.shared";

export type {
  CalendarPriceTransferAutoUpdatePeriod,
  CalendarPriceTransferAutoUpdateSettings,
  CalendarPriceTransferCriterionKey,
  CalendarPriceTransferSyncCriteria,
} from "@/lib/calendar-price-transfer-auto-sync.types";

export {
  CALENDAR_PRICE_TRANSFER_CRITERIA,
  ALL_CALENDAR_PRICE_TRANSFER_CRITERIA,
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

  if (!options?.force && !shouldRunCalendarPriceTransferAutoUpdate(config)) {
    return {
      ok: true,
      skipped: true,
      message: "Henüz güncelleme zamanı gelmedi",
    };
  }

  const criteria = criteriaToSyncFlags(config.criteria);
  const villas = await prisma.villa.findMany({
    where: { active: true },
    select: { id: true },
    orderBy: [{ villaId: "asc" }, { name: "asc" }],
  });

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

  return {
    ok: failCount === 0,
    skipped: false,
    total: villas.length,
    okCount,
    failCount,
    message:
      failCount > 0
        ? `${okCount} villa güncellendi, ${failCount} hatada sorun oluştu. ${samples.join(" | ")}`
        : `${okCount} villa otomatik güncellendi.`,
  };
}
