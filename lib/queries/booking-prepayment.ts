import { prisma } from "@/lib/db";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";

const DEFAULT_PREPAYMENT_RATE = 20;

export type BookingPeriodFees = Record<BookingExtraFeeFieldKey, number | null>;

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

export async function resolveBookingPeriodFees(
  villaId: string,
  checkIn: Date
): Promise<BookingPeriodFees> {
  const day = await prisma.villaPricePeriodDay.findFirst({
    where: {
      villaId,
      date: checkIn,
    },
    select: {
      extraBedFee: true,
      cleaningFee: true,
      petCleaningFee: true,
      underfloorHeatingFee: true,
    },
  });

  return {
    extraAccommodationFee: day?.extraBedFee ?? null,
    cleaningFee: day?.cleaningFee ?? null,
    petCleaningFee: day?.petCleaningFee ?? null,
    poolHeatingPrivateFee: null,
    poolHeatingIndoorFee: null,
    underfloorHeatingFee: day?.underfloorHeatingFee ?? null,
  };
}
