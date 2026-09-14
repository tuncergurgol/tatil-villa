import { prisma } from "@/lib/db";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import {
  emptyStayPeriodFees,
  type StayPeriodFees,
} from "@/lib/stay-period-fees";
import {
  convertNullableCurrencyAmount,
  type PublicExchangeRates,
} from "@/lib/currency-conversion";
import { getPublicExchangeRates } from "@/lib/exchange-rates";

const DEFAULT_PREPAYMENT_RATE = 20;

export type BookingPeriodFees = Record<BookingExtraFeeFieldKey, number | null> & {
  damageDeposit: number | null;
  petDamageDeposit: number | null;
};

export async function resolveBookingPrepaymentRate(
  villaId: string,
  checkIn: Date
): Promise<number> {
  const day = await prisma.villaPricePeriodDay.findFirst({
    where: {
      villaId,
      date: checkIn,
    },
    select: {
      prepaymentRate: true,
    },
  });

  if (day?.prepaymentRate != null && day.prepaymentRate > 0) {
    return day.prepaymentRate;
  }

  return DEFAULT_PREPAYMENT_RATE;
}

export async function resolveStayPeriodFees(
  villaId: string,
  checkIn: Date,
  suppliedExchangeRates?: PublicExchangeRates
): Promise<StayPeriodFees> {
  const [day, exchangeRates] = await Promise.all([
    prisma.villaPricePeriodDay.findFirst({
      where: {
        villaId,
        date: checkIn,
      },
      select: {
        cleaningFee: true,
        cleaningFeeCurrency: true,
        damageDeposit: true,
        damageDepositCurrency: true,
        petCleaningFee: true,
        petCleaningFeeCurrency: true,
        petDamageDeposit: true,
        petDamageDepositCurrency: true,
        underfloorHeatingFee: true,
        underfloorHeatingFeeCurrency: true,
        extraBedFee: true,
        extraBedFeeCurrency: true,
        poolHeatingPrivateFee: true,
        poolHeatingPrivateFeeCurrency: true,
        poolHeatingIndoorFee: true,
        poolHeatingIndoorFeeCurrency: true,
        poolHeatingKidsFee: true,
        poolHeatingKidsFeeCurrency: true,
      },
    }),
    suppliedExchangeRates ?? getPublicExchangeRates(),
  ]);

  if (!day) return emptyStayPeriodFees();

  const toTl = (
    amount: number | null,
    currency: string
  ): number | null =>
    convertNullableCurrencyAmount(
      amount,
      currency,
      "TL",
      exchangeRates
    );

  return {
    cleaningFee: toTl(day.cleaningFee, day.cleaningFeeCurrency),
    damageDeposit: toTl(day.damageDeposit, day.damageDepositCurrency),
    petCleaningFee: toTl(
      day.petCleaningFee,
      day.petCleaningFeeCurrency
    ),
    petDamageDeposit: toTl(
      day.petDamageDeposit,
      day.petDamageDepositCurrency
    ),
    underfloorHeatingFee: toTl(
      day.underfloorHeatingFee,
      day.underfloorHeatingFeeCurrency
    ),
    extraBedFee: toTl(day.extraBedFee, day.extraBedFeeCurrency),
    poolHeatingPrivateFee: toTl(
      day.poolHeatingPrivateFee,
      day.poolHeatingPrivateFeeCurrency
    ),
    poolHeatingIndoorFee: toTl(
      day.poolHeatingIndoorFee,
      day.poolHeatingIndoorFeeCurrency
    ),
    poolHeatingKidsFee: toTl(
      day.poolHeatingKidsFee,
      day.poolHeatingKidsFeeCurrency
    ),
  };
}

export async function resolveBookingPeriodFees(
  villaId: string,
  checkIn: Date,
  exchangeRates?: PublicExchangeRates
): Promise<BookingPeriodFees> {
  const fees = await resolveStayPeriodFees(villaId, checkIn, exchangeRates);

  return {
    extraAccommodationFee: fees.extraBedFee,
    cleaningFee: fees.cleaningFee,
    petCleaningFee: fees.petCleaningFee,
    poolHeatingPrivateFee: fees.poolHeatingPrivateFee,
    poolHeatingIndoorFee: fees.poolHeatingIndoorFee,
    poolHeatingKidsFee: fees.poolHeatingKidsFee,
    underfloorHeatingFee: fees.underfloorHeatingFee,
    damageDeposit: fees.damageDeposit,
    petDamageDeposit: fees.petDamageDeposit,
  };
}
