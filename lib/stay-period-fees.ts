import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";

/** Giriş tarihi periyodundan gelen ek ücret / depozito bilgisi */
export type StayPeriodFees = {
  cleaningFee: number | null;
  damageDeposit: number | null;
  petCleaningFee: number | null;
  petDamageDeposit: number | null;
  underfloorHeatingFee: number | null;
  extraBedFee: number | null;
  poolHeatingPrivateFee: number | null;
  poolHeatingIndoorFee: number | null;
  poolHeatingKidsFee: number | null;
};

export type StayOptionalFeeKey =
  | "underfloorHeatingFee"
  | "poolHeatingPrivateFee"
  | "poolHeatingIndoorFee"
  | "poolHeatingKidsFee";

/** Gece sayısı ile çarpılan seçmeli ücretler (ek yatak hariç — kapasite üstü formülü) */
export const STAY_PER_NIGHT_FEE_KEYS: ReadonlySet<StayOptionalFeeKey> = new Set([
  "poolHeatingPrivateFee",
  "poolHeatingIndoorFee",
  "underfloorHeatingFee",
]);

/** Sıra: Özel Havuz → Kapalı Havuz → Yerden Isıtma → Çocuk Havuzu */
export const STAY_OPTIONAL_FEE_OPTIONS: {
  key: StayOptionalFeeKey;
  label: string;
}[] = [
  { key: "poolHeatingPrivateFee", label: "Havuz Isıtma (Özel Havuz)" },
  { key: "poolHeatingIndoorFee", label: "Havuz Isıtma (Kapalı (İç) Havuz)" },
  { key: "underfloorHeatingFee", label: "Yerden Isıtma" },
  { key: "poolHeatingKidsFee", label: "Havuz Isıtma (Çocuk Havuzu)" },
];

export type StayFeeSelections = Partial<Record<StayOptionalFeeKey, boolean>>;

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

/**
 * Konaklama + temizlik (quote) üzerine seçilen / otomatik ek ücretler.
 * Hasar depozitoları Toplam’a dahil edilmez.
 * Ek yatak: kapasite üstü × gece × birim (otomatik).
 */
export function computeStayExtrasTotal(options: {
  pets: number;
  nights: number;
  adults: number;
  children: number;
  baseCapacity: number;
  fees: StayPeriodFees;
  selections: StayFeeSelections;
}): number {
  const { fees, selections, pets, nights, adults, children, baseCapacity } =
    options;
  let total = 0;

  if (pets > 0) total += positiveFee(fees.petCleaningFee);

  for (const { key } of STAY_OPTIONAL_FEE_OPTIONS) {
    if (!selections[key]) continue;
    total += resolveOptionalFeeAmount(key, fees[key], nights);
  }

  total += resolveExtraBedFeeAmount({
    overCapacityGuests: resolveOverCapacityGuests(
      adults,
      children,
      baseCapacity
    ),
    nights,
    unitFee: fees.extraBedFee,
  });

  return total;
}

export function toBookingExtraFeeRecord(
  fees: StayPeriodFees,
  selections: StayFeeSelections,
  pets: number,
  nights: number,
  overCapacityGuests: number
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
    underfloorHeatingFee: amountOrNull(
      "underfloorHeatingFee",
      Boolean(selections.underfloorHeatingFee)
    ),
  };
}
