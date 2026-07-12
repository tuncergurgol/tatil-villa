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
  | "extraBedFee"
  | "poolHeatingPrivateFee"
  | "poolHeatingIndoorFee"
  | "poolHeatingKidsFee";

export const STAY_OPTIONAL_FEE_OPTIONS: {
  key: StayOptionalFeeKey;
  label: string;
}[] = [
  { key: "underfloorHeatingFee", label: "Yerden Isıtma" },
  { key: "poolHeatingPrivateFee", label: "Havuz Isıtma (Özel Havuz)" },
  { key: "poolHeatingIndoorFee", label: "Havuz Isıtma (Kapalı (İç) Havuz)" },
  { key: "poolHeatingKidsFee", label: "Havuz Isıtma (Çocuk Havuzu)" },
];

/** Ek yatak ayrıca seçilebilir (ısıtma listesinden ayrı) */
export const STAY_EXTRA_BED_OPTION = {
  key: "extraBedFee" as const,
  label: "Ek Yatak",
};

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

/**
 * Konaklama + temizlik (quote) üzerine seçilen / otomatik ek ücretler.
 * Hasar depozitoları Toplam’a dahil edilmez (ayrı gösterilir).
 */
export function computeStayExtrasTotal(options: {
  pets: number;
  fees: StayPeriodFees;
  selections: StayFeeSelections;
}): number {
  const { fees, selections, pets } = options;
  let total = 0;

  if (pets > 0) total += positiveFee(fees.petCleaningFee);

  for (const { key } of STAY_OPTIONAL_FEE_OPTIONS) {
    if (selections[key] && positiveFee(fees[key]) > 0) {
      total += positiveFee(fees[key]);
    }
  }

  if (selections.extraBedFee && positiveFee(fees.extraBedFee) > 0) {
    total += positiveFee(fees.extraBedFee);
  }

  return total;
}

export function toBookingExtraFeeRecord(
  fees: StayPeriodFees,
  selections: StayFeeSelections,
  pets: number
): Record<BookingExtraFeeFieldKey, number | null> {
  return {
    extraAccommodationFee: selections.extraBedFee ? fees.extraBedFee : null,
    cleaningFee: fees.cleaningFee,
    petCleaningFee: pets > 0 ? fees.petCleaningFee : null,
    poolHeatingPrivateFee: selections.poolHeatingPrivateFee
      ? fees.poolHeatingPrivateFee
      : null,
    poolHeatingIndoorFee: selections.poolHeatingIndoorFee
      ? fees.poolHeatingIndoorFee
      : null,
    poolHeatingKidsFee: selections.poolHeatingKidsFee
      ? fees.poolHeatingKidsFee
      : null,
    underfloorHeatingFee: selections.underfloorHeatingFee
      ? fees.underfloorHeatingFee
      : null,
  };
}
