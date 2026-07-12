import { prisma } from "@/lib/db";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import {
  emptyStayPeriodFees,
  type StayPeriodFees,
} from "@/lib/stay-period-fees";

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

export async function resolveStayPeriodFees(
  villaId: string,
  checkIn: Date
): Promise<StayPeriodFees> {
  const day = await prisma.villaPricePeriodDay.findFirst({
    where: {
      villaId,
      date: checkIn,
    },
    select: {
      cleaningFee: true,
      damageDeposit: true,
      petCleaningFee: true,
      petDamageDeposit: true,
      underfloorHeatingFee: true,
      extraBedFee: true,
      poolHeatingPrivateFee: true,
      poolHeatingIndoorFee: true,
      poolHeatingKidsFee: true,
    },
  });

  if (!day) return emptyStayPeriodFees();

  return {
    cleaningFee: day.cleaningFee,
    damageDeposit: day.damageDeposit,
    petCleaningFee: day.petCleaningFee,
    petDamageDeposit: day.petDamageDeposit,
    underfloorHeatingFee: day.underfloorHeatingFee,
    extraBedFee: day.extraBedFee,
    poolHeatingPrivateFee: day.poolHeatingPrivateFee,
    poolHeatingIndoorFee: day.poolHeatingIndoorFee,
    poolHeatingKidsFee: day.poolHeatingKidsFee,
  };
}

export async function resolveBookingPeriodFees(
  villaId: string,
  checkIn: Date
): Promise<BookingPeriodFees> {
  const fees = await resolveStayPeriodFees(villaId, checkIn);

  return {
    extraAccommodationFee: fees.extraBedFee,
    cleaningFee: fees.cleaningFee,
    petCleaningFee: fees.petCleaningFee,
    poolHeatingPrivateFee: fees.poolHeatingPrivateFee,
    poolHeatingIndoorFee: fees.poolHeatingIndoorFee,
    poolHeatingKidsFee: fees.poolHeatingKidsFee,
    underfloorHeatingFee: fees.underfloorHeatingFee,
  };
}
