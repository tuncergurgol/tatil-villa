import type { VillaDayOccupancy } from "@prisma/client";
import {
  compareDates,
  enumerateDateKeys,
  parseDateKey,
  toDateKey,
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

export function offsetDateKey(dateKey: string, offsetDays: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + offsetDays);
  return toDateKey(date);
}

function getOccupancy(
  map: ReadonlyMap<string, VillaDayOccupancy>,
  dateKey: string
): VillaDayOccupancy {
  return map.get(dateKey) ?? "EMPTY";
}

/**
 * DOLU komutu: seçilen aralığı mevcut komşu doluluklarla birleştirir.
 * - İç geceler (başlangıç .. bitiş-1) her zaman BOOKED olur.
 * - Son gün: mevcut GİRİŞ/opsiyon girişi BOOKED kalır; mevcut ÇIKIŞ (turnover dahil) EMPTY kalır.
 * - Tek gün seçiminde komşuya göre BOOKED veya EMPTY atanır.
 */
export function buildBookedOccupancyForStayMerged(
  startKey: string,
  endKey: string,
  existingOccupancyByDateKey: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  const { start, end } = normalizeDateRange(startKey, endKey);
  const keys = enumerateDateKeys(start, end);
  const map = new Map<string, VillaDayOccupancy>();

  if (keys.length === 0) return map;

  if (keys.length === 1) {
    const onlyKey = keys[0]!;
    const existing = getOccupancy(existingOccupancyByDateKey, onlyKey);
    const next = getOccupancy(
      existingOccupancyByDateKey,
      offsetDateKey(onlyKey, 1)
    );

    if (existing === "BOOKED" || existing === "OPTION") {
      map.set(onlyKey, "BOOKED");
    } else {
      map.set(
        onlyKey,
        next === "BOOKED" || next === "OPTION" ? "BOOKED" : "EMPTY"
      );
    }
    return map;
  }

  for (let index = 0; index < keys.length - 1; index++) {
    map.set(keys[index]!, "BOOKED");
  }

  const lastDayKey = keys[keys.length - 1]!;
  const existingEnd = getOccupancy(existingOccupancyByDateKey, lastDayKey);

  const endStatus: VillaDayOccupancy =
    existingEnd === "BOOKED" || existingEnd === "OPTION"
      ? "BOOKED"
      : "EMPTY";

  map.set(lastDayKey, endStatus);
  return map;
}

export function buildBookedOccupancyForStay(
  startKey: string,
  endKey: string,
  existingOccupancyByDateKey?: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  if (existingOccupancyByDateKey) {
    return buildBookedOccupancyForStayMerged(
      startKey,
      endKey,
      existingOccupancyByDateKey
    );
  }

  const { start, end } = normalizeDateRange(startKey, endKey);
  const result = new Map<string, VillaDayOccupancy>();

  for (const key of enumerateDateKeys(start, end)) {
    result.set(key, key === end ? "EMPTY" : "BOOKED");
  }

  return result;
}

/**
 * AÇ komutu: seçilen aralığı mevcut komşu doluluklarla birleştirir.
 * - İç günler (başlangıç+1 .. bitiş-1) her zaman EMPTY olur.
 * - Başlangıç günü EMPTY yapılır (önceki konaklama çıkışı korunur).
 * - Son gün: sonraki günde konaklama varsa mevcut doluluk korunur; aksi halde EMPTY.
 * - Son günden sonraki güne dokunulmaz.
 */
export function buildEmptyOccupancyForRangeMerged(
  startKey: string,
  endKey: string,
  existingOccupancyByDateKey: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  const { start, end } = normalizeDateRange(startKey, endKey);
  const keys = enumerateDateKeys(start, end);
  const map = new Map<string, VillaDayOccupancy>();

  if (keys.length === 0) return map;

  if (keys.length === 1) {
    const onlyKey = keys[0]!;
    const existing = getOccupancy(existingOccupancyByDateKey, onlyKey);
    const next = getOccupancy(
      existingOccupancyByDateKey,
      offsetDateKey(onlyKey, 1)
    );

    if (
      (existing === "BOOKED" || existing === "OPTION") &&
      (next === "BOOKED" || next === "OPTION")
    ) {
      map.set(onlyKey, existing);
      return map;
    }

    map.set(onlyKey, "EMPTY");
    return map;
  }

  const firstDayKey = keys[0]!;
  const lastDayKey = keys[keys.length - 1]!;
  const existingEnd = getOccupancy(existingOccupancyByDateKey, lastDayKey);
  const nextEnd = getOccupancy(
    existingOccupancyByDateKey,
    offsetDateKey(lastDayKey, 1)
  );

  for (let index = 1; index < keys.length - 1; index++) {
    map.set(keys[index]!, "EMPTY");
  }

  map.set(firstDayKey, "EMPTY");

  const preserveEndForNextStay =
    (existingEnd === "BOOKED" || existingEnd === "OPTION") &&
    (nextEnd === "BOOKED" || nextEnd === "OPTION");

  map.set(lastDayKey, preserveEndForNextStay ? existingEnd : "EMPTY");
  return map;
}

export function buildEmptyOccupancyForRange(
  startKey: string,
  endKey: string,
  existingOccupancyByDateKey?: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  if (existingOccupancyByDateKey) {
    return buildEmptyOccupancyForRangeMerged(
      startKey,
      endKey,
      existingOccupancyByDateKey
    );
  }

  const map = new Map<string, VillaDayOccupancy>();
  for (const key of enumerateDateKeysInRange(startKey, endKey)) {
    map.set(key, "EMPTY");
  }
  return map;
}
