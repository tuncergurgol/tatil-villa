import type { VillaDayOccupancy } from "@prisma/client";
import {
  compareDates,
  enumerateDateKeys,
  parseDateKey,
} from "@/lib/villa-period-calendar";

export function normalizeDateRange(
  startKey: string,
  endKey: string
): { start: string; end: string } {
  if (compareDates(parseDateKey(startKey), parseDateKey(endKey)) <= 0) {
    return { start: startKey, end: endKey };
  }
  return { start: endKey, end: startKey };
}

export function enumerateDateKeysInRange(
  startKey: string,
  endKey: string
): string[] {
  const { start, end } = normalizeDateRange(startKey, endKey);
  return enumerateDateKeys(start, end);
}

export function countNightsBetween(startKey: string, endKey: string): number {
  const keys = enumerateDateKeysInRange(startKey, endKey);
  return Math.max(0, keys.length - 1);
}

export function isDateKeyInRange(
  dateKey: string,
  startKey: string,
  endKey: string
): boolean {
  const { start, end } = normalizeDateRange(startKey, endKey);
  return (
    compareDates(parseDateKey(dateKey), parseDateKey(start)) >= 0 &&
    compareDates(parseDateKey(dateKey), parseDateKey(end)) <= 0
  );
}

export function buildBookedOccupancyForStay(
  startKey: string,
  endKey: string
): Map<string, VillaDayOccupancy> {
  const { start, end } = normalizeDateRange(startKey, endKey);
  const map = new Map<string, VillaDayOccupancy>();

  for (const key of enumerateDateKeys(start, end)) {
    map.set(key, key === end ? "EMPTY" : "BOOKED");
  }

  return map;
}

export function buildEmptyOccupancyForRange(
  startKey: string,
  endKey: string
): Map<string, VillaDayOccupancy> {
  const map = new Map<string, VillaDayOccupancy>();
  for (const key of enumerateDateKeysInRange(startKey, endKey)) {
    map.set(key, "EMPTY");
  }
  return map;
}
