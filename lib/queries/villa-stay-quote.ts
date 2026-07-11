import { prisma } from "@/lib/db";
import {
  computeStayQuote,
  getStayNightKeys,
  type StayQuote,
  type StayQuoteDayInput,
} from "@/lib/stay-quote";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import { resolveBookingPeriodFees } from "@/lib/queries/booking-prepayment";
import type { VillaDayOccupancy } from "@prisma/client";

export type VillaStayQuoteResult = {
  quote: StayQuote;
  fees: Record<BookingExtraFeeFieldKey, number | null>;
  damageDeposit: number | null;
};

const QUOTE_DAY_SELECT = {
  date: true,
  nightlyPrice: true,
  nightlyPriceWithoutCommission: true,
  discountedNightlyPrice: true,
  nightlyPriceCurrency: true,
  availability: true,
  occupancyStatus: true,
  minStayNights: true,
  prepaymentRate: true,
  cleaningFee: true,
  cleaningFeeCurrency: true,
  cleaningDayCount: true,
  period: {
    select: {
      damageDeposit: true,
    },
  },
} as const;

export function mapDbPeriodDayToQuoteInput(
  dateKey: string,
  day: {
    nightlyPrice: number;
    nightlyPriceWithoutCommission: number | null;
    discountedNightlyPrice: number | null;
    nightlyPriceCurrency: StayQuoteDayInput["nightlyPriceCurrency"];
    availability: StayQuoteDayInput["availability"];
    occupancyStatus: VillaDayOccupancy;
    minStayNights: number | null;
    prepaymentRate: number | null;
    cleaningFee: number | null;
    cleaningFeeCurrency: StayQuoteDayInput["cleaningFeeCurrency"];
    cleaningDayCount?: number | null;
  }
): StayQuoteDayInput {
  return {
    dateKey,
    nightlyPrice: day.nightlyPrice,
    nightlyPriceWithoutCommission: day.nightlyPriceWithoutCommission,
    discountedNightlyPrice: day.discountedNightlyPrice,
    nightlyPriceCurrency: day.nightlyPriceCurrency,
    availability: day.availability,
    occupancyStatus: day.occupancyStatus,
    minStayNights: day.minStayNights,
    prepaymentRate: day.prepaymentRate,
    cleaningFee: day.cleaningFee,
    cleaningFeeCurrency: day.cleaningFeeCurrency,
    cleaningDayCount: day.cleaningDayCount ?? null,
  };
}

/** Tüm sistemde kullanılan rezervasyon hesaplama sorgusu */
export async function resolveVillaStayQuote(
  villaId: string,
  checkIn: string,
  checkOut: string
): Promise<VillaStayQuoteResult | null> {
  const nightKeys = getStayNightKeys(checkIn, checkOut);
  if (nightKeys.length === 0) return null;

  const rangeStart = new Date(`${nightKeys[0]}T00:00:00.000Z`);
  const rangeEnd = new Date(`${nightKeys[nightKeys.length - 1]}T00:00:00.000Z`);

  const [periodDays, fees, periodMeta] = await Promise.all([
    prisma.villaPricePeriodDay.findMany({
      where: {
        villaId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: QUOTE_DAY_SELECT,
    }),
    resolveBookingPeriodFees(villaId, rangeStart),
    prisma.villaPricePeriodDay.findFirst({
      where: { villaId, date: rangeStart },
      select: {
        period: { select: { damageDeposit: true } },
      },
    }),
  ]);

  const daysByDateKey = new Map<string, StayQuoteDayInput>();
  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(new Date(day.date));
    daysByDateKey.set(dateKey, mapDbPeriodDayToQuoteInput(dateKey, day));
  }

  return {
    quote: computeStayQuote(checkIn, checkOut, daysByDateKey),
    fees,
    damageDeposit: periodMeta?.period.damageDeposit ?? null,
  };
}
