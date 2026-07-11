import type { VillaDayOccupancy } from "@prisma/client";
import { compareDates, parseDateKey } from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";

export function toOccupancyStatus(value?: string | null): VillaDayOccupancy {
  if (value === "BOOKED" || value === "OPTION") return value;
  return "EMPTY";
}

export function isNightBlocked(
  occupancyMap: Map<string, VillaDayOccupancy>,
  dateKey: string
) {
  const status = occupancyMap.get(dateKey) ?? "EMPTY";
  return status === "BOOKED" || status === "OPTION";
}

/** checkIn dahil, checkOut hariç geceler dolu mu? */
export function rangeHasBlockedNight(
  start: string,
  end: string,
  occupancyMap: Map<string, VillaDayOccupancy>
) {
  if (compareDates(parseDateKey(start), parseDateKey(end)) >= 0) return true;
  let key = start;
  while (compareDates(parseDateKey(key), parseDateKey(end)) < 0) {
    if (isNightBlocked(occupancyMap, key)) return true;
    key = offsetDateKey(key, 1);
  }
  return false;
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
