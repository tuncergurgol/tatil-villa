import { prisma } from "@/lib/db";
import type { VillaPricePeriod } from "@prisma/client";
import {
  compareDates,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";
import {
  reassignPeriodDaysInRange,
  updateVillaPricePeriodDaysInRange,
} from "@/lib/villa-period-day-sync";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";

export function periodRecordToSnapshot(
  period: VillaPricePeriod
): VillaPeriodDayPricingSnapshot {
  return {
    availability: period.availability,
    nightlyPrice: period.nightlyPrice,
    nightlyPriceCurrency: period.nightlyPriceCurrency,
    nightlyPriceWithoutCommission: period.nightlyPriceWithoutCommission,
    discountedNightlyPrice: period.discountedNightlyPrice,
    weeklyPrice: period.weeklyPrice,
    prepaymentRate: period.prepaymentRate,
    commissionRate: period.commissionRate,
    minStayNights: period.minStayNights,
    cleaningDayCount: period.cleaningDayCount,
    cleaningFee: period.cleaningFee,
    cleaningFeeCurrency: period.cleaningFeeCurrency,
    damageDeposit: period.damageDeposit,
    damageDepositCurrency: period.damageDepositCurrency,
    petCleaningFee: period.petCleaningFee,
    petCleaningFeeCurrency: period.petCleaningFeeCurrency,
    petDamageDeposit: period.petDamageDeposit,
    petDamageDepositCurrency: period.petDamageDepositCurrency,
    underfloorHeatingFee: period.underfloorHeatingFee,
    underfloorHeatingFeeCurrency: period.underfloorHeatingFeeCurrency,
    extraBedFee: period.extraBedFee,
    extraBedFeeCurrency: period.extraBedFeeCurrency,
    discount1Rate: period.discount1Rate,
    discount2Rate: period.discount2Rate,
    extraDiscountAmount: period.extraDiscountAmount,
    weekendPrice: period.weekendPrice,
    weekendDays: period.weekendDays,
    weekendMinStayNights: period.weekendMinStayNights,
    childFee02: period.childFee02,
    childFee02Currency: period.childFee02Currency,
    childFee03_09: period.childFee03_09,
    childFee03_09Currency: period.childFee03_09Currency,
    occupancyStatus: "EMPTY",
  };
}

export function periodDataFromSnapshot(
  snapshot: VillaPeriodDayPricingSnapshot
): Omit<VillaPeriodDayPricingSnapshot, "occupancyStatus"> {
  const { occupancyStatus: _occupancy, ...periodData } = snapshot;
  return periodData;
}

function offsetDate(date: Date, offsetDays: number): Date {
  return parseDateKey(offsetDateKey(toDateKey(date), offsetDays));
}

export async function applyPartialVillaPricePeriodEdit(
  villaId: string,
  periodId: string,
  editStart: Date,
  editEnd: Date,
  newSnapshot: VillaPeriodDayPricingSnapshot
) {
  const period = await prisma.villaPricePeriod.findFirst({
    where: { id: periodId, villaId },
  });

  if (!period) {
    throw new Error("Periyot bulunamadı");
  }

  const periodStart = startOfDay(period.startDate);
  const periodEnd = startOfDay(period.endDate);
  const rangeStart = startOfDay(editStart);
  const rangeEnd = startOfDay(editEnd);

  if (
    compareDates(rangeStart, periodStart) < 0 ||
    compareDates(rangeEnd, periodEnd) > 0
  ) {
    throw new Error("Düzenleme aralığı periyot sınırları içinde olmalı");
  }

  const oldSnapshot = periodRecordToSnapshot(period);
  const hasBefore = compareDates(rangeStart, periodStart) > 0;
  const hasAfter = compareDates(rangeEnd, periodEnd) < 0;

  if (!hasBefore && !hasAfter) {
    await prisma.villaPricePeriod.update({
      where: { id: periodId },
      data: periodDataFromSnapshot(newSnapshot),
    });
    await updateVillaPricePeriodDaysInRange(
      periodId,
      villaId,
      rangeStart,
      rangeEnd,
      newSnapshot
    );
    return;
  }

  const beforeEnd = hasBefore ? offsetDate(rangeStart, -1) : null;
  const afterStart = hasAfter ? offsetDate(rangeEnd, 1) : null;

  await prisma.$transaction(async (tx) => {
    let middlePeriodId = periodId;
    let afterPeriodId: string | null = null;

    if (hasBefore) {
      await tx.villaPricePeriod.update({
        where: { id: periodId },
        data: { endDate: beforeEnd! },
      });
    }

    if (!hasBefore) {
      await tx.villaPricePeriod.update({
        where: { id: periodId },
        data: {
          startDate: rangeStart,
          endDate: rangeEnd,
          ...periodDataFromSnapshot(newSnapshot),
        },
      });
    } else {
      const middle = await tx.villaPricePeriod.create({
        data: {
          villaId,
          startDate: rangeStart,
          endDate: rangeEnd,
          ...periodDataFromSnapshot(newSnapshot),
        },
      });
      middlePeriodId = middle.id;
    }

    if (hasAfter) {
      const after = await tx.villaPricePeriod.create({
        data: {
          villaId,
          startDate: afterStart!,
          endDate: periodEnd,
          ...periodDataFromSnapshot(oldSnapshot),
        },
      });
      afterPeriodId = after.id;
    }

    await reassignPeriodDaysInRange(
      tx,
      middlePeriodId,
      villaId,
      rangeStart,
      rangeEnd,
      newSnapshot
    );

    if (hasAfter && afterPeriodId && afterStart) {
      await reassignPeriodDaysInRange(
        tx,
        afterPeriodId,
        villaId,
        afterStart,
        periodEnd,
        oldSnapshot
      );
    }
  });
}
