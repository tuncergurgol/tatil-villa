import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import { addDaysToDateKey } from "@/lib/villa-period-calendar";

/** Giriş tarihi periyodundan gelen ek ücret / depozito bilgisi */
export type StayPeriodFees = {
  cleaningFee: number | null;
  damageDeposit: number | null;
  petCleaningFee: number | null;
  petDamageDeposit: number | null;
  underfloorHeatingFee: number | null;
  extraBedFee: number | null;
  /** Period havuz ücretleri — ısıtmalı havuz kaydı yoksa seçmeli checkbox */
  poolHeatingPrivateFee: number | null;
  poolHeatingIndoorFee: number | null;
  poolHeatingKidsFee: number | null;
};

export type StayOptionalFeeKey =
  | "underfloorHeatingFee"
  | "poolHeatingPrivateFee"
  | "poolHeatingIndoorFee"
  | "poolHeatingKidsFee";

/** Gece sayısı ile çarpılan seçmeli ücretler */
export const STAY_PER_NIGHT_FEE_KEYS: ReadonlySet<StayOptionalFeeKey> = new Set([
  "underfloorHeatingFee",
  "poolHeatingPrivateFee",
  "poolHeatingIndoorFee",
  "poolHeatingKidsFee",
]);

/** Havuz ısıtma period alanları — ısıtmalı havuz kaydı yoksa checkbox olarak kullanılır */
export const STAY_PERIOD_POOL_OPTIONAL_FEE_KEYS: ReadonlySet<StayOptionalFeeKey> =
  new Set([
    "poolHeatingPrivateFee",
    "poolHeatingIndoorFee",
    "poolHeatingKidsFee",
  ]);

export const STAY_OPTIONAL_FEE_OPTIONS: {
  key: StayOptionalFeeKey;
  label: string;
}[] = [
  { key: "underfloorHeatingFee", label: "Yerden Isıtma" },
  { key: "poolHeatingPrivateFee", label: "Havuz Isıtma (Özel Havuz)" },
  { key: "poolHeatingIndoorFee", label: "Havuz Isıtma (Kapalı (İç) Havuz)" },
  { key: "poolHeatingKidsFee", label: "Havuz Isıtma (Çocuk Havuzu)" },
];

export type StayFeeSelections = Partial<Record<StayOptionalFeeKey, boolean>>;

/** Isıtmalı havuz + ısıtma periyotları (public rezervasyon) */
export type HeatedPoolPeriod = {
  startDate: string;
  endDate: string;
  heatingFee: number | null;
  heatingFeeCurrency: string;
  poolOpen: boolean;
};

export type HeatedPoolOption = {
  id: string;
  name: string;
  periods: HeatedPoolPeriod[];
};

export type PoolHeatingSelections = Record<string, boolean>;

/** Isıtmalı havuz listesi varken period havuz ücretlerini tekrar gösterme */
export function shouldUsePeriodPoolOptionalFees(
  heatedPools: HeatedPoolOption[] | undefined
): boolean {
  return !heatedPools || heatedPools.length === 0;
}

export function emptyStayPeriodFees(): StayPeriodFees {
  return {
    cleaningFee: null,
    damageDeposit: null,
    petCleaningFee: null,
    petDamageDeposit: null,
    underfloorHeatingFee: null,
    extraBedFee: null,
    poolHeatingPrivateFee: null,
    poolHeatingIndoorFee: null,
    poolHeatingKidsFee: null,
  };
}

export function positiveFee(value: number | null | undefined): number {
  return value != null && value > 0 ? value : 0;
}

/** Yetişkin + çocuk üzerinden kapasite üstü kişi sayısı (bebek sayılmaz) */
export function resolveOverCapacityGuests(
  adults: number,
  children: number,
  baseCapacity: number
): number {
  const staying = Math.max(0, adults) + Math.max(0, children);
  return Math.max(0, staying - Math.max(0, baseCapacity));
}

export function resolveOptionalFeeAmount(
  key: StayOptionalFeeKey,
  unitFee: number | null | undefined,
  nights: number
): number {
  const unit = positiveFee(unitFee);
  if (unit <= 0) return 0;
  if (STAY_PER_NIGHT_FEE_KEYS.has(key)) {
    return unit * Math.max(1, nights);
  }
  return unit;
}

/** Ek yatak: kapasite üstü kişi × gece × birim ücret */
export function resolveExtraBedFeeAmount(options: {
  overCapacityGuests: number;
  nights: number;
  unitFee: number | null | undefined;
}): number {
  const unit = positiveFee(options.unitFee);
  const guests = Math.max(0, options.overCapacityGuests);
  const nights = Math.max(0, options.nights);
  if (unit <= 0 || guests <= 0 || nights <= 0) return 0;
  return guests * nights * unit;
}

export function formatExtraBedFeeBreakdown(options: {
  overCapacityGuests: number;
  nights: number;
  unitFee: number;
  currency?: string;
}): string {
  const unitLabel = options.unitFee.toLocaleString("tr-TR", {
    maximumFractionDigits: 0,
  });
  const currency =
    options.currency === "TL" || options.currency === "TRY" || !options.currency
      ? "TL"
      : options.currency;
  return `${options.overCapacityGuests} Kişi * ${options.nights} Gece * ${unitLabel} ${currency}`;
}

export function stayNightKeys(checkIn: string, checkOut: string): string[] {
  if (!checkIn || !checkOut || checkIn >= checkOut) return [];
  const keys: string[] = [];
  let cursor = checkIn;
  while (cursor < checkOut) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return keys;
}

function toPeriodDateKey(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findPoolPeriodForNight(
  periods: HeatedPoolPeriod[],
  nightKey: string
): HeatedPoolPeriod | null {
  for (const period of periods) {
    if (!period.poolOpen) continue;
    const start = toPeriodDateKey(period.startDate);
    const end = toPeriodDateKey(period.endDate);
    if (nightKey >= start && nightKey <= end) {
      return period;
    }
  }
  return null;
}

/**
 * Havuz ısıtma: konaklama geceleri için eşleşen açık periyot ücretlerinin toplamı.
 * Aynı birim ücret tüm gecelerde geçerliyse unitFee = o birim; aksi halde null.
 */
export function resolvePoolHeatingStayAmount(options: {
  periods: HeatedPoolPeriod[];
  checkIn: string;
  checkOut: string;
}): {
  total: number;
  unitFee: number | null;
  currency: string;
  nightsWithFee: number;
} {
  const nights = stayNightKeys(options.checkIn, options.checkOut);
  let total = 0;
  let nightsWithFee = 0;
  let currency = "TL";
  const units = new Set<number>();

  for (const nightKey of nights) {
    const period = findPoolPeriodForNight(options.periods, nightKey);
    const fee = positiveFee(period?.heatingFee);
    if (!period || fee <= 0) continue;
    total += fee;
    nightsWithFee += 1;
    units.add(fee);
    currency =
      period.heatingFeeCurrency === "TRY" || !period.heatingFeeCurrency
        ? "TL"
        : period.heatingFeeCurrency;
  }

  return {
    total,
    unitFee: units.size === 1 ? [...units][0]! : null,
    currency,
    nightsWithFee,
  };
}

export function formatPoolHeatingBreakdown(options: {
  unitFee: number | null;
  nights: number;
  total: number;
  currency?: string;
}): string {
  const currency =
    options.currency === "TL" || options.currency === "TRY" || !options.currency
      ? "TL"
      : options.currency;
  if (options.unitFee != null && options.unitFee > 0 && options.nights > 0) {
    const unitLabel = options.unitFee.toLocaleString("tr-TR", {
      maximumFractionDigits: 0,
    });
    return `${unitLabel} ${currency} × ${options.nights} gece`;
  }
  const totalLabel = options.total.toLocaleString("tr-TR", {
    maximumFractionDigits: 0,
  });
  return `${totalLabel} ${currency}`;
}

/**
 * Konaklama + temizlik (quote) üzerine seçilen / otomatik ek ücretler.
 * Hasar depozitoları Toplam’a dahil edilmez.
 * Ek yatak: kapasite üstü × gece × birim (otomatik).
 * Havuz ısıtma: seçilen ısıtmalı havuzların periyot toplamı.
 */
export function computeStayExtrasTotal(options: {
  pets: number;
  nights: number;
  adults: number;
  children: number;
  baseCapacity: number;
  fees: StayPeriodFees;
  selections: StayFeeSelections;
  heatedPools?: HeatedPoolOption[];
  poolHeatingSelections?: PoolHeatingSelections;
  checkIn?: string | null;
  checkOut?: string | null;
}): number {
  const {
    fees,
    selections,
    pets,
    nights,
    adults,
    children,
    baseCapacity,
    heatedPools = [],
    poolHeatingSelections = {},
    checkIn,
    checkOut,
  } = options;
  let total = 0;

  if (pets > 0) total += positiveFee(fees.petCleaningFee);

  total += resolveExtraBedFeeAmount({
    overCapacityGuests: resolveOverCapacityGuests(
      adults,
      children,
      baseCapacity
    ),
    nights,
    unitFee: fees.extraBedFee,
  });

  const usePeriodPoolFees = shouldUsePeriodPoolOptionalFees(heatedPools);

  for (const { key } of STAY_OPTIONAL_FEE_OPTIONS) {
    if (!usePeriodPoolFees && STAY_PERIOD_POOL_OPTIONAL_FEE_KEYS.has(key)) {
      continue;
    }
    if (!selections[key]) continue;
    total += resolveOptionalFeeAmount(key, fees[key], nights);
  }

  if (!usePeriodPoolFees && checkIn && checkOut) {
    for (const pool of heatedPools) {
      if (!poolHeatingSelections[pool.id]) continue;
      total += resolvePoolHeatingStayAmount({
        periods: pool.periods,
        checkIn,
        checkOut,
      }).total;
    }
  }

  return total;
}

type PoolHeatingFeeBucket =
  | "poolHeatingPrivateFee"
  | "poolHeatingIndoorFee"
  | "poolHeatingKidsFee";

/** Havuz adından admin form alanına eşleme (Özel / Kapalı / Çocuk). */
export function resolvePoolHeatingFeeFieldKey(
  poolName: string
): PoolHeatingFeeBucket {
  const name = poolName.toLocaleLowerCase("tr");
  if (
    name.includes("çocuk") ||
    name.includes("cocuk") ||
    name.includes("kids") ||
    name.includes("child")
  ) {
    return "poolHeatingKidsFee";
  }
  if (
    name.includes("kapalı") ||
    name.includes("kapali") ||
    name.includes("indoor") ||
    name.includes("iç") ||
    name.includes("ic ")
  ) {
    return "poolHeatingIndoorFee";
  }
  return "poolHeatingPrivateFee";
}

export function resolveSelectedPoolHeatingFees(options: {
  heatedPools: HeatedPoolOption[];
  poolHeatingSelections: PoolHeatingSelections;
  checkIn: string;
  checkOut: string;
}): Record<PoolHeatingFeeBucket, number | null> {
  const totals: Record<PoolHeatingFeeBucket, number> = {
    poolHeatingPrivateFee: 0,
    poolHeatingIndoorFee: 0,
    poolHeatingKidsFee: 0,
  };

  for (const pool of options.heatedPools) {
    if (!options.poolHeatingSelections[pool.id]) continue;
    const amount = resolvePoolHeatingStayAmount({
      periods: pool.periods,
      checkIn: options.checkIn,
      checkOut: options.checkOut,
    }).total;
    if (amount <= 0) continue;
    totals[resolvePoolHeatingFeeFieldKey(pool.name)] += amount;
  }

  return {
    poolHeatingPrivateFee:
      totals.poolHeatingPrivateFee > 0 ? totals.poolHeatingPrivateFee : null,
    poolHeatingIndoorFee:
      totals.poolHeatingIndoorFee > 0 ? totals.poolHeatingIndoorFee : null,
    poolHeatingKidsFee:
      totals.poolHeatingKidsFee > 0 ? totals.poolHeatingKidsFee : null,
  };
}

/**
 * Talep ekranı kalemlerini admin rezervasyon formu alanlarına çevirir.
 * Konaklama (grossPrice) ayrı tutulur; cleaningFee quote’tan gelir.
 */
export function buildStayBookingFeeDetails(options: {
  fees: StayPeriodFees;
  selections: StayFeeSelections;
  pets: number;
  nights: number;
  adults: number;
  children: number;
  baseCapacity: number;
  cleaningFee?: number | null;
  heatedPools?: HeatedPoolOption[];
  poolHeatingSelections?: PoolHeatingSelections;
  checkIn?: string | null;
  checkOut?: string | null;
}): Record<BookingExtraFeeFieldKey, number | null> {
  const {
    fees,
    selections,
    pets,
    nights,
    adults,
    children,
    baseCapacity,
    cleaningFee,
    heatedPools = [],
    poolHeatingSelections = {},
    checkIn,
    checkOut,
  } = options;

  const amountOrNull = (key: StayOptionalFeeKey, selected: boolean) => {
    if (!selected) return null;
    const amount = resolveOptionalFeeAmount(key, fees[key], nights);
    return amount > 0 ? amount : null;
  };

  const extraBed = resolveExtraBedFeeAmount({
    overCapacityGuests: resolveOverCapacityGuests(
      adults,
      children,
      baseCapacity
    ),
    nights,
    unitFee: fees.extraBedFee,
  });

  const usePeriodPoolFees = shouldUsePeriodPoolOptionalFees(heatedPools);
  const poolFees =
    !usePeriodPoolFees && checkIn && checkOut
      ? resolveSelectedPoolHeatingFees({
          heatedPools,
          poolHeatingSelections,
          checkIn,
          checkOut,
        })
      : {
          poolHeatingPrivateFee: amountOrNull(
            "poolHeatingPrivateFee",
            Boolean(selections.poolHeatingPrivateFee)
          ),
          poolHeatingIndoorFee: amountOrNull(
            "poolHeatingIndoorFee",
            Boolean(selections.poolHeatingIndoorFee)
          ),
          poolHeatingKidsFee: amountOrNull(
            "poolHeatingKidsFee",
            Boolean(selections.poolHeatingKidsFee)
          ),
        };

  const cleaning = positiveFee(cleaningFee ?? fees.cleaningFee);

  return {
    extraAccommodationFee: extraBed > 0 ? extraBed : null,
    cleaningFee: cleaning > 0 ? cleaning : null,
    petCleaningFee: pets > 0 ? fees.petCleaningFee : null,
    poolHeatingPrivateFee: poolFees.poolHeatingPrivateFee,
    poolHeatingIndoorFee: poolFees.poolHeatingIndoorFee,
    poolHeatingKidsFee: poolFees.poolHeatingKidsFee,
    underfloorHeatingFee: amountOrNull(
      "underfloorHeatingFee",
      Boolean(selections.underfloorHeatingFee)
    ),
  };
}

/** @deprecated buildStayBookingFeeDetails kullanın */
export function toBookingExtraFeeRecord(
  fees: StayPeriodFees,
  selections: StayFeeSelections,
  pets: number,
  nights: number,
  overCapacityGuests: number,
  poolHeatingTotal = 0
): Record<BookingExtraFeeFieldKey, number | null> {
  const amountOrNull = (key: StayOptionalFeeKey, selected: boolean) => {
    if (!selected) return null;
    const amount = resolveOptionalFeeAmount(key, fees[key], nights);
    return amount > 0 ? amount : null;
  };

  const extraBed = resolveExtraBedFeeAmount({
    overCapacityGuests,
    nights,
    unitFee: fees.extraBedFee,
  });

  return {
    extraAccommodationFee: extraBed > 0 ? extraBed : null,
    cleaningFee: fees.cleaningFee,
    petCleaningFee: pets > 0 ? fees.petCleaningFee : null,
    poolHeatingPrivateFee: poolHeatingTotal > 0 ? poolHeatingTotal : null,
    poolHeatingIndoorFee: null,
    poolHeatingKidsFee: null,
    underfloorHeatingFee: amountOrNull(
      "underfloorHeatingFee",
      Boolean(selections.underfloorHeatingFee)
    ),
  };
}
