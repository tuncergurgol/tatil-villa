import type { VillaDayOccupancy, VillaPeriodCurrency } from "@prisma/client";
import type { VillaPeriodAvailability } from "@/lib/villa-period-pricing";
import { enumerateDateKeysInRange } from "@/lib/villa-period-selection";

export type StayQuoteDayInput = {
  dateKey: string;
  nightlyPrice: number;
  nightlyPriceWithoutCommission: number | null;
  discountedNightlyPrice: number | null;
  nightlyPriceCurrency: VillaPeriodCurrency;
  availability: VillaPeriodAvailability;
  occupancyStatus: VillaDayOccupancy;
  minStayNights: number | null;
  prepaymentRate: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
  cleaningDayCount: number | null;
};

export type StayQuoteNightLine = {
  dateKey: string;
  price: number;
};

export type StayQuote = {
  nights: number;
  accommodationTotal: number;
  commissionTotal: number;
  cleaningFee: number;
  total: number;
  currency: VillaPeriodCurrency;
  prepaymentRate: number;
  prepaymentAmount: number;
  checkInPayment: number;
  minStayNights: number | null;
  cleaningDayCount: number | null;
  nightLines: StayQuoteNightLine[];
  valid: boolean;
  missingNightKeys: string[];
  invalidReason: string | null;
};

export function getStayNightKeys(checkIn: string, checkOut: string): string[] {
  const keys = enumerateDateKeysInRange(checkIn, checkOut);
  if (keys.length <= 1) return [];
  return keys.slice(0, -1);
}

function getDisplayNightlyPrice(day: StayQuoteDayInput): number {
  return day.discountedNightlyPrice ?? day.nightlyPrice;
}

function getCommissionForNight(day: StayQuoteDayInput): number {
  if (day.nightlyPriceWithoutCommission == null) return 0;
  return Math.max(0, day.nightlyPrice - day.nightlyPriceWithoutCommission);
}

/**
 * Temizlik bedeli: giriş günü (ilk gece) periyodundan alınır.
 * cleaningDayCount > 0 ise yalnızca nights < cleaningDayCount iken uygulanır.
 * cleaningDayCount yoksa ve fee > 0 ise uygulanır.
 */
export function resolveCleaningFeeForStay(options: {
  nights: number;
  cleaningFee: number | null | undefined;
  cleaningDayCount: number | null | undefined;
}): number {
  const fee = options.cleaningFee;
  if (fee == null || fee <= 0) return 0;

  const threshold = options.cleaningDayCount;
  if (threshold != null && threshold > 0) {
    return options.nights < threshold ? fee : 0;
  }

  return fee;
}

/**
 * Rezervasyon hesaplama formu — tüm sistemde ortak kurallar.
 *
 * - Konaklama: her gecenin (discountedNightlyPrice ?? nightlyPrice) toplamı
 * - Min. konaklama, temizlik bedeli, temizlik gün eşiği, ön ödeme oranı:
 *   seçilen ilk tarihin (giriş gecesi) periyot bilgileri
 */
export function computeStayQuote(
  checkIn: string,
  checkOut: string,
  daysByDateKey: ReadonlyMap<string, StayQuoteDayInput>
): StayQuote {
  const nightKeys = getStayNightKeys(checkIn, checkOut);
  const nights = nightKeys.length;

  const empty = (
    overrides: Partial<StayQuote> & { invalidReason: string | null }
  ): StayQuote => ({
    nights,
    accommodationTotal: 0,
    commissionTotal: 0,
    cleaningFee: 0,
    total: 0,
    currency: "TL",
    prepaymentRate: 20,
    prepaymentAmount: 0,
    checkInPayment: 0,
    minStayNights: null,
    cleaningDayCount: null,
    nightLines: [],
    valid: false,
    missingNightKeys: [],
    ...overrides,
  });

  if (nights === 0) {
    return empty({
      nights: 0,
      invalidReason: "Geçerli bir konaklama aralığı seçin.",
    });
  }

  const missingNightKeys: string[] = [];
  const nightLines: StayQuoteNightLine[] = [];
  let accommodationTotal = 0;
  let commissionTotal = 0;

  for (const dateKey of nightKeys) {
    const day = daysByDateKey.get(dateKey);
    if (!day) {
      missingNightKeys.push(dateKey);
      continue;
    }
    const price = getDisplayNightlyPrice(day);
    nightLines.push({ dateKey, price });
    accommodationTotal += price;
    commissionTotal += getCommissionForNight(day);
  }

  const firstDay = daysByDateKey.get(nightKeys[0]) ?? null;
  const currency = firstDay?.nightlyPriceCurrency ?? "TL";
  const prepaymentRate =
    firstDay?.prepaymentRate != null && firstDay.prepaymentRate > 0
      ? firstDay.prepaymentRate
      : 20;
  const minStayNights =
    firstDay?.minStayNights != null && firstDay.minStayNights > 0
      ? firstDay.minStayNights
      : null;
  const cleaningDayCount =
    firstDay?.cleaningDayCount != null && firstDay.cleaningDayCount > 0
      ? firstDay.cleaningDayCount
      : null;
  const cleaningFee = resolveCleaningFeeForStay({
    nights,
    cleaningFee: firstDay?.cleaningFee,
    cleaningDayCount: firstDay?.cleaningDayCount,
  });

  let invalidReason: string | null = null;
  if (missingNightKeys.length > 0) {
    invalidReason = "Seçilen tarihler için fiyat bilgisi eksik.";
  } else if (minStayNights != null && nights < minStayNights) {
    invalidReason = `Minimum konaklama ${minStayNights} gecedir.`;
  }

  const valid = invalidReason == null;
  const total = accommodationTotal + cleaningFee;
  const prepaymentAmount = valid
    ? Math.round((accommodationTotal * prepaymentRate) / 100)
    : 0;
  const checkInPayment = valid ? Math.max(0, total - prepaymentAmount) : 0;

  return {
    nights,
    accommodationTotal,
    commissionTotal,
    cleaningFee,
    total,
    currency,
    prepaymentRate,
    prepaymentAmount,
    checkInPayment,
    minStayNights,
    cleaningDayCount,
    nightLines,
    valid,
    missingNightKeys,
    invalidReason,
  };
}

export function buildStayQuoteDayMap(
  days: Array<{
    date: string;
    occupancyStatus?: string | null;
    nightlyPrice?: number;
    nightlyPriceWithoutCommission?: number | null;
    discountedNightlyPrice?: number | null;
    nightlyPriceCurrency?: VillaPeriodCurrency | string;
    availability?: VillaPeriodAvailability | string;
    minStayNights?: number | null;
    prepaymentRate?: number | null;
    cleaningFee?: number | null;
    cleaningFeeCurrency?: VillaPeriodCurrency | string;
    cleaningDayCount?: number | null;
    price?: number;
    currency?: string;
  }>
): Map<string, StayQuoteDayInput> {
  const map = new Map<string, StayQuoteDayInput>();

  for (const day of days) {
    const occupancy =
      day.occupancyStatus === "BOOKED" || day.occupancyStatus === "OPTION"
        ? day.occupancyStatus
        : "EMPTY";
    const currency = (day.nightlyPriceCurrency ??
      day.currency ??
      "TL") as VillaPeriodCurrency;
    const availability = (day.availability === "closed"
      ? "closed"
      : "available") as VillaPeriodAvailability;
    const nightlyPrice = day.nightlyPrice ?? day.price ?? 0;

    map.set(day.date, {
      dateKey: day.date,
      nightlyPrice,
      nightlyPriceWithoutCommission: day.nightlyPriceWithoutCommission ?? null,
      discountedNightlyPrice: day.discountedNightlyPrice ?? null,
      nightlyPriceCurrency: currency,
      availability,
      occupancyStatus: occupancy,
      minStayNights: day.minStayNights ?? null,
      prepaymentRate: day.prepaymentRate ?? null,
      cleaningFee: day.cleaningFee ?? null,
      cleaningFeeCurrency: (day.cleaningFeeCurrency ??
        currency) as VillaPeriodCurrency,
      cleaningDayCount: day.cleaningDayCount ?? null,
    });
  }

  return map;
}
