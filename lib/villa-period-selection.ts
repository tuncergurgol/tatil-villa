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

/** Kapama/opsiyon yazımı onaylı (RESERVED) günleri ezmesin. */
function sealReservedDays(
  map: Map<string, VillaDayOccupancy>,
  existingOccupancyByDateKey: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  for (const [dateKey, nextStatus] of map) {
    if (
      getOccupancy(existingOccupancyByDateKey, dateKey) === "RESERVED" &&
      nextStatus !== "RESERVED"
    ) {
      map.set(dateKey, "RESERVED");
    }
  }
  return map;
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

    if (existing === "BOOKED" || existing === "OPTION" || existing === "RESERVED") {
      map.set(
        onlyKey,
        existing === "RESERVED" ? "RESERVED" : "BOOKED"
      );
    } else {
      map.set(
        onlyKey,
        next === "BOOKED" || next === "OPTION" ? "BOOKED" : "EMPTY"
      );
    }
    return sealReservedDays(map, existingOccupancyByDateKey);
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
  // Önceki gece doluysa:
  // - 2+ gece kapamada ilk gün turnover EMPTY (çıkış+giriş),
  // - tek gece kapamada ilk gün BOOKED (aksi halde hiç dolu gece yazılmaz);
  //   görsel çıkış+giriş occupancyCheckIn ile çözülür.
  const firstDayStatus: VillaDayOccupancy = isOccupied(dayBeforeFirst)
    ? keys.length === 2
      ? "BOOKED"
      : "EMPTY"
    : isOccupied(existingFirst)
      ? existingFirst
      : "BOOKED";
  map.set(firstDayKey, firstDayStatus);

  const lastDayKey = keys[keys.length - 1]!;
  // Sonraki bloğun girişi occupancyCheckIn ile yalnızca bitiş gününde
  // zaten dolu giriş varken işaretlenir (ertesi gün dolu diye değil).
  map.set(lastDayKey, "EMPTY");
  return sealReservedDays(map, existingOccupancyByDateKey);
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
 * Onaylı rezervasyon: BOOKED ile aynı giriş–çıkış kuralı; günler RESERVED yazılır.
 */
export function buildReservedOccupancyForStayMerged(
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
      map.set(onlyKey, existing === "OPTION" ? "OPTION" : "RESERVED");
    } else {
      map.set(
        onlyKey,
        isOccupied(next) ? "RESERVED" : "EMPTY"
      );
    }
    return map;
  }

  for (let index = 0; index < keys.length - 1; index++) {
    if (index > 0) {
      map.set(keys[index]!, "RESERVED");
    }
  }

  const firstDayKey = keys[0]!;
  const prevNightKey = offsetDateKey(firstDayKey, -1);
  const dayBeforeFirst = getOccupancy(existingOccupancyByDateKey, prevNightKey);
  const existingFirst = getOccupancy(existingOccupancyByDateKey, firstDayKey);
  let firstDayStatus: VillaDayOccupancy;
  if (isOccupied(dayBeforeFirst)) {
    // Kapama son gece BOOKED iken ertesi gün rezervasyon girişi: RESERVED (10 Ağu senaryosu).
    // Önceki gece RESERVED ise aynı gün çıkış+giriş: EMPTY (5 Ağu rezervasyon çıkışı).
    if (
      dayBeforeFirst === "BOOKED" &&
      firstDayKey === offsetDateKey(prevNightKey, 1)
    ) {
      firstDayStatus = "RESERVED";
    } else {
      firstDayStatus = "EMPTY";
    }
  } else if (isOccupied(existingFirst)) {
    firstDayStatus =
      existingFirst === "OPTION" ? "OPTION" : "RESERVED";
  } else {
    firstDayStatus = "RESERVED";
  }
  map.set(firstDayKey, firstDayStatus);

  const lastDayKey = keys[keys.length - 1]!;
  const existingEnd = getOccupancy(existingOccupancyByDateKey, lastDayKey);
  // Bitiş günü çıkışdır; sonraki bloğun mevcut girişi korunur.
  map.set(
    lastDayKey,
    isOccupied(existingEnd)
      ? existingEnd === "OPTION"
        ? "OPTION"
        : "RESERVED"
      : "EMPTY"
  );
  return map;
}

export function buildReservedOccupancyForStay(
  startKey: string,
  endKey: string,
  existingOccupancyByDateKey?: ReadonlyMap<string, VillaDayOccupancy>
): Map<string, VillaDayOccupancy> {
  if (existingOccupancyByDateKey) {
    return buildReservedOccupancyForStayMerged(
      startKey,
      endKey,
      existingOccupancyByDateKey
    );
  }

  const { start, end } = normalizeDateRange(startKey, endKey);
  const result = new Map<string, VillaDayOccupancy>();

  for (const key of enumerateDateKeys(start, end)) {
    result.set(key, key === end ? "EMPTY" : "RESERVED");
  }

  return result;
}

function isOccupied(status: VillaDayOccupancy): boolean {
  return status === "BOOKED" || status === "RESERVED" || status === "OPTION";
}

/** EMPTY günden hemen önceki bitişik dolu gece sayısı. */
function countBookedNightsImmediatelyBefore(
  dateKey: string,
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>
): number {
  let count = 0;
  let cursor = offsetDateKey(dateKey, -1);
  while (isOccupied(getOccupancy(occupancyMap, cursor))) {
    count += 1;
    cursor = offsetDateKey(cursor, -1);
  }
  return count;
}

/** BOOKED zincirinin çıkış (EMPTY) gününü bulur. */
export function findBookedStayCheckoutDateKey(
  fromBookedDateKey: string,
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>
): string {
  let cursor = fromBookedDateKey;
  while (isOccupied(getOccupancy(occupancyMap, cursor))) {
    cursor = offsetDateKey(cursor, 1);
  }
  return cursor;
}

/**
 * Kapatma aralığının takvimdeki ilk günü (giriş veya turnover EMPTY günü).
 */
export function findCloseRangeMinKey(
  bookedDateKey: string,
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>
): string {
  const checkoutDateKey = findBookedStayCheckoutDateKey(
    bookedDateKey,
    occupancyMap
  );
  const prevKey = offsetDateKey(bookedDateKey, -1);
  const bookedRange = enumerateDateKeysInRange(bookedDateKey, checkoutDateKey);

  const fromBooked = buildBookedOccupancyForStay(
    bookedDateKey,
    checkoutDateKey,
    occupancyMap
  );
  const bookedOnlyMatches = bookedRange.every(
    (dateKey) =>
      fromBooked.get(dateKey) === getOccupancy(occupancyMap, dateKey)
  );

  const priorCheckoutBeforeBooked =
    normalizeOccupancy(getOccupancy(occupancyMap, prevKey)) === "EMPTY" &&
    isOccupied(getOccupancy(occupancyMap, offsetDateKey(prevKey, -1)));

  if (priorCheckoutBeforeBooked) {
    const fromPrev = buildBookedOccupancyForStay(
      prevKey,
      checkoutDateKey,
      occupancyMap
    );
    const fullRange = enumerateDateKeysInRange(prevKey, checkoutDateKey);
    const fullMatches = fullRange.every(
      (dateKey) =>
        fromPrev.get(dateKey) === getOccupancy(occupancyMap, dateKey)
    );

    if (fullMatches) {
      if (bookedOnlyMatches) {
        const nightsBeforePrev = countBookedNightsImmediatelyBefore(
          prevKey,
          occupancyMap
        );
        const newBookedNights = bookedRange.filter(
          (dateKey) =>
            dateKey !== checkoutDateKey &&
            isOccupied(getOccupancy(occupancyMap, dateKey))
        ).length;

        // Aynı gün yeniden kapatma (10–13 önceki 1–10 çıkışı üzerine): önceki blok
        // belirgin şekilde uzunsa turnover günü prevKey'tir.
        // Bitişik ertesi gün blok (5 çıkış + 6–9 giriş): kapatma bookedDateKey'ten başlar.
        if (nightsBeforePrev > newBookedNights + 1) {
          return prevKey;
        }
        return bookedDateKey;
      }

      return prevKey;
    }
  }

  if (bookedOnlyMatches) {
    return bookedDateKey;
  }

  return bookedDateKey;
}

function normalizeOccupancy(
  value: VillaDayOccupancy
): "EMPTY" | "BOOKED" | "RESERVED" | "OPTION" {
  if (!value || value === "EMPTY") return "EMPTY";
  return value;
}

/**
 * OPSİYON komutu: DOLU (BOOKED) ile aynı giriş–çıkış mantığını izler.
 * - Önceki gece doluysa çok gecelik opsiyonda ilk gün turnover EMPTY.
 * - Tek gecelik opsiyonda ilk gün OPTION (aksi halde dolu gece kalmaz).
 * - Son gün her zaman çıkış EMPTY.
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
      map.set(onlyKey, existing === "RESERVED" ? "RESERVED" : "OPTION");
    } else {
      map.set(onlyKey, isOccupied(next) ? "OPTION" : "EMPTY");
    }
    return sealReservedDays(map, existingOccupancyByDateKey);
  }

  for (let index = 0; index < keys.length - 1; index++) {
    if (index > 0) {
      map.set(keys[index]!, "OPTION");
    }
  }

  const firstDayKey = keys[0]!;
  const dayBeforeFirst = getOccupancy(
    existingOccupancyByDateKey,
    offsetDateKey(firstDayKey, -1)
  );
  const firstDayStatus: VillaDayOccupancy = isOccupied(dayBeforeFirst)
    ? keys.length === 2
      ? "OPTION"
      : "EMPTY"
    : "OPTION";
  map.set(firstDayKey, firstDayStatus);

  const lastDayKey = keys[keys.length - 1]!;
  map.set(lastDayKey, "EMPTY");
  return sealReservedDays(map, existingOccupancyByDateKey);
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
      map.set(onlyKey, existing);
      return map;
    }

    map.set(onlyKey, "EMPTY");
    return map;
  }

  const firstDayKey = keys[0]!;

  for (let index = 1; index < keys.length - 1; index++) {
    map.set(keys[index]!, "EMPTY");
  }

  // Açma da kapama gibi konaklama aralığıdır: yalnızca ilk gün ile son gün
  // arasındaki geceler boşalır. Son gün (çıkış) olduğu gibi kalır; açma işlemi
  // hiçbir zaman yeni gece kapatmaz. Blok o günde devam ediyorsa kalan blok
  // oradan başlar (giriş işareti applyVillaPeriodDaysOccupancy'de yazılır).
  map.set(firstDayKey, "EMPTY");
  map.set(lastDayKey, getOccupancy(existingOccupancyByDateKey, lastDayKey));
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
