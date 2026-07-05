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
  valid: boolean;
  missingNightKeys: string[];
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

export function computeStayQuote(
  checkIn: string,
  checkOut: string,
  daysByDateKey: ReadonlyMap<string, StayQuoteDayInput>
): StayQuote {
  const nightKeys = getStayNightKeys(checkIn, checkOut);
  const nights = nightKeys.length;

  if (nights === 0) {
    return {
      nights: 0,
      accommodationTotal: 0,
      commissionTotal: 0,
      cleaningFee: 0,
      total: 0,
      currency: "TL",
      prepaymentRate: 20,
      prepaymentAmount: 0,
      checkInPayment: 0,
      minStayNights: null,
      valid: false,
      missingNightKeys: [],
    };
  }

  const missingNightKeys: string[] = [];
  let accommodationTotal = 0;
  let commissionTotal = 0;
  let maxMinStay: number | null = null;
  let currency: VillaPeriodCurrency = "TL";
  let prepaymentRate = 20;
  let cleaningFee = 0;

  nightKeys.forEach((dateKey, index) => {
    const day = daysByDateKey.get(dateKey);
    if (!day) {
      missingNightKeys.push(dateKey);
      return;
    }

    if (index === 0) {
      currency = day.nightlyPriceCurrency;
      if (day.prepaymentRate != null && day.prepaymentRate > 0) {
        prepaymentRate = day.prepaymentRate;
      }
      if (day.cleaningFee != null && day.cleaningFee > 0) {
        cleaningFee = day.cleaningFee;
      }
    }

    accommodationTotal += getDisplayNightlyPrice(day);
    commissionTotal += getCommissionForNight(day);

    if (day.minStayNights != null && day.minStayNights > 0) {
      maxMinStay =
        maxMinStay == null
          ? day.minStayNights
          : Math.max(maxMinStay, day.minStayNights);
    }
  });

  const valid =
    missingNightKeys.length === 0 &&
    (maxMinStay == null || nights >= maxMinStay);

  const total = accommodationTotal + cleaningFee;
  const prepaymentAmount = valid
    ? Math.round((total * prepaymentRate) / 100)
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
    minStayNights: maxMinStay,
    valid,
    missingNightKeys,
  };
}
