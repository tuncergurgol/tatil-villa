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
 * - İç geceler (başlangıç+1 .. bitiş-1) BOOKED olur.
 * - İlk gün: önceki gecede dolu varsa EMPTY (çıkış/turnover); yoksa BOOKED (giriş).
 * - Son gün: sonraki gecede dolu varsa EMPTY (turnover); aksi halde çıkış için EMPTY.
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
    if (index > 0) {
      map.set(keys[index]!, "BOOKED");
    }
  }

  const firstDayKey = keys[0]!;
  const dayBeforeFirst = getOccupancy(
    existingOccupancyByDateKey,
    offsetDateKey(firstDayKey, -1)
  );
  const existingFirst = getOccupancy(existingOccupancyByDateKey, firstDayKey);
  const firstDayStatus: VillaDayOccupancy =
    isOccupied(dayBeforeFirst) || isOccupied(existingFirst)
      ? isOccupied(existingFirst)
        ? existingFirst
        : "EMPTY"
      : "BOOKED";
  map.set(firstDayKey, firstDayStatus);

  const lastDayKey = keys[keys.length - 1]!;
  // Seçilen bitiş tarihi her zaman çıkış günüdür (EMPTY).
  map.set(lastDayKey, "EMPTY");
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

function isOccupied(status: VillaDayOccupancy): boolean {
  return status === "BOOKED" || status === "OPTION";
}

/**
 * OPSİYON komutu: DOLU ile aynı giriş–çıkış mantığını izler.
 * - İç geceler (başlangıç .. bitiş-1) OPTION olur.
 * - Son gün ÇIKIŞ kabul edilir: mevcut GİRİŞ/opsiyon girişi korunur,
 *   aksi halde EMPTY kalır (çıkış günü opsiyon değildir).
 * - Tek gün seçiminde komşuya göre OPTION veya EMPTY atanır.
 */
export function buildOptionOccupancyForStayMerged(
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

    if (isOccupied(existing)) {
      map.set(onlyKey, "OPTION");
    } else {
      map.set(onlyKey, isOccupied(next) ? "OPTION" : "EMPTY");
    }
    return map;
  }

  for (let index = 0; index < keys.length - 1; index++) {
    map.set(keys[index]!, "OPTION");
  }

  const lastDayKey = keys[keys.length - 1]!;
  const existingEnd = getOccupancy(existingOccupancyByDateKey, lastDayKey);

  map.set(lastDayKey, isOccupied(existingEnd) ? "OPTION" : "EMPTY");
  return map;
}

export function buildOptionOccupancyForStay(
  startKey: string,
  endKey: string,
  existingOccupancyByDateKey?: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  if (existingOccupancyByDateKey) {
    return buildOptionOccupancyForStayMerged(
      startKey,
      endKey,
      existingOccupancyByDateKey
    );
  }

  const { start, end } = normalizeDateRange(startKey, endKey);
  const result = new Map<string, VillaDayOccupancy>();

  for (const key of enumerateDateKeys(start, end)) {
    result.set(key, key === end ? "EMPTY" : "OPTION");
  }

  return result;
}

/**
 * AÇ komutu: seçilen aralığı mevcut komşu doluluklarla birleştirir.
 * - Dolu blok ortasında açılırsa: ilk gün ÇIKIŞ (EMPTY), son gün GİRİŞ (BOOKED).
 * - Blok sonundan (veya sonrasında dolu yoksa) açılırsa tüm seçim EMPTY olur.
 * - İç günler EMPTY olur.
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

  const prevStart = getOccupancy(
    existingOccupancyByDateKey,
    offsetDateKey(keys[0]!, -1)
  );
  const lastDayKey = keys[keys.length - 1]!;
  const nextEnd = getOccupancy(
    existingOccupancyByDateKey,
    offsetDateKey(lastDayKey, 1)
  );

  if (keys.length === 1) {
    const onlyKey = keys[0]!;
    const existing = getOccupancy(existingOccupancyByDateKey, onlyKey);

    if (isOccupied(prevStart) && isOccupied(nextEnd)) {
      map.set(onlyKey, "EMPTY");
      return map;
    }

    if (
      isOccupied(existing) &&
      isOccupied(nextEnd) &&
      !isOccupied(prevStart)
    ) {
      map.set(onlyKey, "BOOKED");
      return map;
    }

    map.set(onlyKey, "EMPTY");
    return map;
  }

  const firstDayKey = keys[0]!;

  for (let index = 1; index < keys.length - 1; index++) {
    map.set(keys[index]!, "EMPTY");
  }

  // İlk gün her zaman çıkar (ÇIKIŞ). Son gün yalnızca sonrasında
  // dolu gece varsa GİRİŞ olarak BOOKED kalır; blok sonundan açılıyorsa EMPTY.
  map.set(firstDayKey, "EMPTY");
  map.set(lastDayKey, isOccupied(nextEnd) ? "BOOKED" : "EMPTY");
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
