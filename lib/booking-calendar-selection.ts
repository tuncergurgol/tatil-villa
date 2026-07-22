import type { VillaDayOccupancy } from "@prisma/client";
import { compareDates, parseDateKey } from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";
import { isTurnoverOccupancyDay } from "@/lib/villa-period-day-visual";

/** Yarım-açık konaklama: [checkIn, checkOut) */
export type AllowStayRange = {
  checkIn: string;
  checkOut: string;
};

export function toOccupancyStatus(value?: string | null): VillaDayOccupancy {
  if (value === "BOOKED" || value === "OPTION") return value;
  return "EMPTY";
}

/** Gece, allowStay yarım-açık aralığında mı? */
export function isNightInAllowStay(
  dateKey: string,
  allowStay?: AllowStayRange | null
): boolean {
  if (!allowStay?.checkIn || !allowStay?.checkOut) return false;
  if (allowStay.checkIn >= allowStay.checkOut) return false;
  return dateKey >= allowStay.checkIn && dateKey < allowStay.checkOut;
}

/**
 * BOOKED/OPTION gece kapalıdır.
 * Giriş+çıkış günü (iki dolu blok arası EMPTY) yeni misafirin gecesidir → kapalı.
 */
export function isOccupancyNightBlocked(
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>,
  dateKey: string,
  allowStay?: AllowStayRange | null
): boolean {
  if (isNightInAllowStay(dateKey, allowStay)) return false;
  const status = occupancyMap.get(dateKey) ?? "EMPTY";
  if (status === "BOOKED" || status === "OPTION") return true;
  return isTurnoverOccupancyDay(
    status,
    occupancyMap.get(offsetDateKey(dateKey, -1)),
    occupancyMap.get(offsetDateKey(dateKey, 1))
  );
}

/**
 * BOOKED/OPTION gece kapalıdır.
 * Admin edit: allowStay ile kendi rezervasyon geceleri seçilebilir kalır
 * (görünüm yine BOOKED/OPTION; engel sadece seçim için kalkar).
 */
export function isNightBlocked(
  occupancyMap: Map<string, VillaDayOccupancy>,
  dateKey: string,
  allowStay?: AllowStayRange | null
) {
  return isOccupancyNightBlocked(occupancyMap, dateKey, allowStay);
}

/** checkIn dahil, checkOut hariç geceler dolu mu? */
export function rangeHasBlockedNight(
  start: string,
  end: string,
  occupancyMap: Map<string, VillaDayOccupancy>,
  allowStay?: AllowStayRange | null
) {
  if (compareDates(parseDateKey(start), parseDateKey(end)) >= 0) return true;
  let key = start;
  while (compareDates(parseDateKey(key), parseDateKey(end)) < 0) {
    if (isNightBlocked(occupancyMap, key, allowStay)) return true;
    key = offsetDateKey(key, 1);
  }
  return false;
}

/** Villa detay / booking form ile aynı gün tıklama kuralları */
export function canSelectStayDay(options: {
  dateKey: string;
  today: Date;
  pendingStart: string | null;
  occupancyMap: Map<string, VillaDayOccupancy>;
  allowStay?: AllowStayRange | null;
}): boolean {
  const { dateKey, today, pendingStart, occupancyMap, allowStay } = options;
  if (compareDates(parseDateKey(dateKey), today) < 0) return false;

  if (!pendingStart) {
    return !isNightBlocked(occupancyMap, dateKey, allowStay);
  }

  if (compareDates(parseDateKey(dateKey), parseDateKey(pendingStart)) <= 0) {
    return !isNightBlocked(occupancyMap, dateKey, allowStay);
  }

  return !rangeHasBlockedNight(pendingStart, dateKey, occupancyMap, allowStay);
}

export function buildOccupancyMap(
  days: Array<{ date: string; occupancyStatus: string }>
) {
  const map = new Map<string, VillaDayOccupancy>();
  for (const day of days) {
    map.set(day.date, toOccupancyStatus(day.occupancyStatus));
  }
  return map;
}
