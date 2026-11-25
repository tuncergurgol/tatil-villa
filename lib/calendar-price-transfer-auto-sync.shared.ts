import type { CalendarPriceTransferAutoUpdateSettings } from "@/lib/calendar-price-transfer-auto-sync.types";
import { getAutoUpdateIntervalMs } from "@/lib/calendar-price-transfer-auto-sync.types";

export { getAutoUpdateIntervalMs } from "@/lib/calendar-price-transfer-auto-sync.types";

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
