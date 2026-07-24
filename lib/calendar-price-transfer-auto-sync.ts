import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  runCalendarPriceTransferBatchSync,
  type CalendarPriceTransferSyncCriteria,
} from "@/lib/calendar-price-transfer-sync";

export type CalendarPriceTransferAutoUpdatePeriod = "hour" | "day";

export type CalendarPriceTransferCriterionKey =
  | "whatsapp"
  | "ical"
  | "link1"
  | "link2"
  | "link3";

export const CALENDAR_PRICE_TRANSFER_CRITERIA: Array<{
  key: CalendarPriceTransferCriterionKey;
  label: string;
}> = [
  { key: "whatsapp", label: "Whatsapp" },
  { key: "ical", label: "İcal" },
  { key: "link1", label: "Link 1" },
  { key: "link2", label: "Link 2" },
  { key: "link3", label: "Link 3" },
];

export type CalendarPriceTransferAutoUpdateSettings = {
  enabled: boolean;
  period: CalendarPriceTransferAutoUpdatePeriod;
  interval: number;
  criteria: CalendarPriceTransferCriterionKey[];
  lastRunAt: Date | null;
};

const ALL_CRITERIA = CALENDAR_PRICE_TRANSFER_CRITERIA.map((item) => item.key);

export function parseCalendarPriceTransferCriteria(
  raw: string | null | undefined
): CalendarPriceTransferCriterionKey[] {
  if (!raw?.trim()) return ["ical", "link1", "link2", "link3"];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ["ical", "link1", "link2", "link3"];
    return parsed.filter((item): item is CalendarPriceTransferCriterionKey =>
      ALL_CRITERIA.includes(item as CalendarPriceTransferCriterionKey)
    );
  } catch {
    return ["ical", "link1", "link2", "link3"];
  }
}

export function serializeCalendarPriceTransferCriteria(
  criteria: CalendarPriceTransferCriterionKey[]
) {
  return JSON.stringify(
    criteria.filter((item) => ALL_CRITERIA.includes(item))
  );
}

export function criteriaToSyncFlags(
  criteria: CalendarPriceTransferCriterionKey[]
): CalendarPriceTransferSyncCriteria {
  const set = new Set(criteria);
  return {
    whatsapp: set.has("whatsapp"),
    ical: set.has("ical"),
    link1: set.has("link1"),
    link2: set.has("link2"),
    link3: set.has("link3"),
  };
}

export function clampAutoUpdateInterval(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(24, Math.max(1, Math.round(value)));
}

export function getAutoUpdateIntervalMs(
  period: CalendarPriceTransferAutoUpdatePeriod,
  interval: number
) {
  const unit = clampAutoUpdateInterval(interval);
  if (period === "day") return unit * 24 * 60 * 60 * 1000;
  return unit * 60 * 60 * 1000;
}

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

export function shouldRunCalendarPriceTransferAutoUpdate(
  config: CalendarPriceTransferAutoUpdateSettings,
  now = new Date()
) {
  if (!config.enabled) return false;
  if (config.criteria.length === 0) return false;
  if (!config.lastRunAt) return true;

  const elapsed = now.getTime() - config.lastRunAt.getTime();
  return elapsed >= getAutoUpdateIntervalMs(config.period, config.interval);
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
