import { prisma } from "@/lib/db";
import {
  computeStayQuote,
  convertStayQuoteDayToTl,
  getStayNightKeys,
  type StayQuote,
  type StayQuoteDayInput,
} from "@/lib/stay-quote";
import {
  convertNullableCurrencyAmount,
  type PublicExchangeRates,
} from "@/lib/currency-conversion";
import { getPublicExchangeRates } from "@/lib/exchange-rates";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import {
  resolveBookingPeriodFees,
  resolveStayPeriodFees,
} from "@/lib/queries/booking-prepayment";
import type {
  HeatedPoolOption,
  StayPeriodFees,
} from "@/lib/stay-period-fees";
import type { VillaDayOccupancy } from "@prisma/client";

export type VillaStayQuoteResult = {
  quote: StayQuote;
  exchangeRates: PublicExchangeRates;
  /** Birim ücret alanları (legacy / wizard) */
  fees: Record<BookingExtraFeeFieldKey, number | null>;
  /** Public rezervasyon hesabı ile aynı period ücretleri */
  periodFees: StayPeriodFees;
  heatedPools: HeatedPoolOption[];
  baseCapacity: number;
  damageDeposit: number | null;
  allowPrepaymentOption: boolean;
  allowFullPaymentOption: boolean;
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
  },
  exchangeRates?: PublicExchangeRates
): StayQuoteDayInput {
  const input: StayQuoteDayInput = {
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
  return exchangeRates
    ? convertStayQuoteDayToTl(input, exchangeRates)
    : input;
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
  const exchangeRates = await getPublicExchangeRates();

  const [periodDays, fees, periodFees, villa] = await Promise.all([
    prisma.villaPricePeriodDay.findMany({
      where: {
        villaId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: QUOTE_DAY_SELECT,
    }),
    resolveBookingPeriodFees(villaId, rangeStart, exchangeRates),
    resolveStayPeriodFees(villaId, rangeStart, exchangeRates),
    prisma.villa.findUnique({
      where: { id: villaId },
      select: {
        guests: true,
        allowPrepaymentOption: true,
        allowFullPaymentOption: true,
        pools: {
          where: { heated: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            poolType: true,
            periods: {
              orderBy: { startDate: "asc" },
              select: {
                startDate: true,
                endDate: true,
                heatingFee: true,
                heatingFeeCurrency: true,
                poolOpen: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const daysByDateKey = new Map<string, StayQuoteDayInput>();
  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(new Date(day.date));
    daysByDateKey.set(
      dateKey,
      mapDbPeriodDayToQuoteInput(dateKey, day, exchangeRates)
    );
  }

  const heatedPools: HeatedPoolOption[] = (villa?.pools ?? []).map((pool) => ({
    id: pool.id,
    name: pool.poolType || "Havuz",
    periods: pool.periods.map((period) => ({
      startDate: dbDateToDateKey(period.startDate),
      endDate: dbDateToDateKey(period.endDate),
      heatingFee: convertNullableCurrencyAmount(
        period.heatingFee,
        period.heatingFeeCurrency,
        "TL",
        exchangeRates
      ),
      heatingFeeCurrency: "TL",
      poolOpen: period.poolOpen,
    })),
  }));

  return {
    quote: computeStayQuote(checkIn, checkOut, daysByDateKey),
    exchangeRates,
    fees,
    periodFees,
    heatedPools,
    baseCapacity: villa?.guests ?? 0,
    damageDeposit: periodFees.damageDeposit,
    allowPrepaymentOption: villa?.allowPrepaymentOption !== false,
    allowFullPaymentOption: villa?.allowFullPaymentOption !== false,
  };
}
