import { prisma } from "@/lib/db";
import type { VillaPricePeriod } from "@prisma/client";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";
import {
  reassignPeriodDaysDiscountInRange,
  reassignPeriodDaysInRange,
  updateVillaPricePeriodDaysInRange,
} from "@/lib/villa-period-day-sync";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";
import { resolveVillaPeriodPricing } from "@/lib/villa-period-pricing";

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
    poolHeatingPrivateFee: period.poolHeatingPrivateFee,
    poolHeatingPrivateFeeCurrency: period.poolHeatingPrivateFeeCurrency,
    poolHeatingIndoorFee: period.poolHeatingIndoorFee,
    poolHeatingIndoorFeeCurrency: period.poolHeatingIndoorFeeCurrency,
    poolHeatingKidsFee: period.poolHeatingKidsFee,
    poolHeatingKidsFeeCurrency: period.poolHeatingKidsFeeCurrency,
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

function toRangeDate(date: Date): Date {
  return dateKeyToDbDate(dbDateToDateKey(date));
}

function isValidDateRange(startKey: string, endKey: string) {
  return startKey <= endKey;
}

type TailSegment = {
  startDate: Date;
  endDate: Date;
  snapshot: VillaPeriodDayPricingSnapshot;
};

export function collectTailSegments(
  overlappingPeriods: VillaPricePeriod[],
  rangeStart: Date,
  rangeEnd: Date
): { tails: TailSegment[]; periodIdsToRemove: string[] } {
  const rangeStartKey = dbDateToDateKey(rangeStart);
  const rangeEndKey = dbDateToDateKey(rangeEnd);
  const tails: TailSegment[] = [];
  const periodIdsToRemove: string[] = [];

  for (const period of overlappingPeriods) {
    const oldSnapshot = periodRecordToSnapshot(period);
    const periodStartKey = dbDateToDateKey(period.startDate);
    const periodEndKey = dbDateToDateKey(period.endDate);
    periodIdsToRemove.push(period.id);

    if (periodStartKey < rangeStartKey) {
      const beforeEndKey = offsetDateKey(rangeStartKey, -1);
      if (isValidDateRange(periodStartKey, beforeEndKey)) {
        tails.push({
          startDate: dateKeyToDbDate(periodStartKey),
          endDate: dateKeyToDbDate(beforeEndKey),
          snapshot: oldSnapshot,
        });
      }
    }

    if (periodEndKey > rangeEndKey) {
      const afterStartKey = offsetDateKey(rangeEndKey, 1);
      if (isValidDateRange(afterStartKey, periodEndKey)) {
        tails.push({
          startDate: dateKeyToDbDate(afterStartKey),
          endDate: dateKeyToDbDate(periodEndKey),
          snapshot: oldSnapshot,
        });
      }
    }
  }

  return { tails, periodIdsToRemove };
}

async function findOverlappingPeriods(
  villaId: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  const periods = await prisma.villaPricePeriod.findMany({
    where: {
      villaId,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    orderBy: { startDate: "asc" },
  });

  if (periods.length === 0) {
    throw new Error("Seçilen aralıkta periyot bulunamadı");
  }

  return periods;
}

export async function applyVillaPriceRangeEdit(
  villaId: string,
  editStart: Date,
  editEnd: Date,
  buildSnapshot: (period: VillaPricePeriod) => VillaPeriodDayPricingSnapshot
) {
  const rangeStart = toRangeDate(editStart);
  const rangeEnd = toRangeDate(editEnd);
  const overlappingPeriods = await findOverlappingPeriods(
    villaId,
    rangeStart,
    rangeEnd
  );
  const middleSnapshot = buildSnapshot(overlappingPeriods[0]!);

  await applyVillaPriceRangeMergedEdit(
    villaId,
    rangeStart,
    rangeEnd,
    middleSnapshot,
    overlappingPeriods
  );
}

export async function applyVillaPriceRangeMergedEdit(
  villaId: string,
  rangeStart: Date,
  rangeEnd: Date,
  middleSnapshot: VillaPeriodDayPricingSnapshot,
  overlappingPeriods?: VillaPricePeriod[],
  extraPeriodIdsToRemove: string[] = []
): Promise<{ removedPeriodIds: string[] }> {
  const normalizedStart = toRangeDate(rangeStart);
  const normalizedEnd = toRangeDate(rangeEnd);
  const periods =
    overlappingPeriods ??
    (await findOverlappingPeriods(villaId, normalizedStart, normalizedEnd));
  const { tails, periodIdsToRemove } = collectTailSegments(
    periods,
    normalizedStart,
    normalizedEnd
  );
  const idsToDelete = [
    ...new Set([...periodIdsToRemove, ...extraPeriodIdsToRemove]),
  ];

  await prisma.$transaction(async (tx) => {
    const middlePeriod = await tx.villaPricePeriod.create({
      data: {
        villaId,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        ...periodDataFromSnapshot(middleSnapshot),
      },
    });

    for (const tail of tails) {
      const tailPeriod = await tx.villaPricePeriod.create({
        data: {
          villaId,
          startDate: tail.startDate,
          endDate: tail.endDate,
          ...periodDataFromSnapshot(tail.snapshot),
        },
      });

      await reassignPeriodDaysInRange(
        tx,
        tailPeriod.id,
        villaId,
        tail.startDate,
        tail.endDate,
        tail.snapshot
      );
    }

    await reassignPeriodDaysInRange(
      tx,
      middlePeriod.id,
      villaId,
      normalizedStart,
      normalizedEnd,
      middleSnapshot
    );

    if (idsToDelete.length > 0) {
      await tx.villaPricePeriod.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  });

  return { removedPeriodIds: idsToDelete };
}

export async function applyVillaPriceRangeDiscountEdit(
  villaId: string,
  editStart: Date,
  editEnd: Date,
  discountUpdate: {
    discount1Rate: number | null;
    discount2Rate: number | null;
    extraDiscountAmount: number | null;
  },
  _buildHeaderSnapshot?: (period: VillaPricePeriod) => VillaPeriodDayPricingSnapshot
) {
  const rangeStart = toRangeDate(editStart);
  const rangeEnd = toRangeDate(editEnd);
  const overlappingPeriods = await findOverlappingPeriods(
    villaId,
    rangeStart,
    rangeEnd
  );
  const rangeStartKey = dbDateToDateKey(rangeStart);
  const rangeEndKey = dbDateToDateKey(rangeEnd);

  await prisma.$transaction(async (tx) => {
    const idsToDelete: string[] = [];

    async function createSegment(
      startKey: string,
      endKey: string,
      snapshot: VillaPeriodDayPricingSnapshot,
      applyDiscount: boolean
    ) {
      const startDate = dateKeyToDbDate(startKey);
      const endDate = dateKeyToDbDate(endKey);
      const created = await tx.villaPricePeriod.create({
        data: {
          villaId,
          startDate,
          endDate,
          ...periodDataFromSnapshot(snapshot),
        },
      });

      if (applyDiscount) {
        await reassignPeriodDaysDiscountInRange(
          tx,
          created.id,
          villaId,
          startDate,
          endDate,
          discountUpdate
        );
        return;
      }

      await reassignPeriodDaysInRange(
        tx,
        created.id,
        villaId,
        startDate,
        endDate,
        snapshot
      );
    }

    for (const period of overlappingPeriods) {
      const periodStartKey = dbDateToDateKey(period.startDate);
      const periodEndKey = dbDateToDateKey(period.endDate);
      const intersectStartKey =
        periodStartKey > rangeStartKey ? periodStartKey : rangeStartKey;
      const intersectEndKey =
        periodEndKey < rangeEndKey ? periodEndKey : rangeEndKey;
      if (intersectStartKey > intersectEndKey) continue;

      idsToDelete.push(period.id);
      const originalSnapshot = periodRecordToSnapshot(period);
      const discountedSnapshot = overlayDiscountOnPeriod(
        period,
        discountUpdate
      );

      if (periodStartKey < intersectStartKey) {
        const beforeEndKey = offsetDateKey(intersectStartKey, -1);
        if (isValidDateRange(periodStartKey, beforeEndKey)) {
          await createSegment(
            periodStartKey,
            beforeEndKey,
            originalSnapshot,
            false
          );
        }
      }

      await createSegment(
        intersectStartKey,
        intersectEndKey,
        discountedSnapshot,
        true
      );

      if (periodEndKey > intersectEndKey) {
        const afterStartKey = offsetDateKey(intersectEndKey, 1);
        if (isValidDateRange(afterStartKey, periodEndKey)) {
          await createSegment(
            afterStartKey,
            periodEndKey,
            originalSnapshot,
            false
          );
        }
      }
    }

    if (idsToDelete.length > 0) {
      await tx.villaPricePeriod.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  });
}

function overlayDiscountOnPeriod(
  period: VillaPricePeriod,
  discountUpdate: {
    discount1Rate: number | null;
    discount2Rate: number | null;
    extraDiscountAmount: number | null;
  }
): VillaPeriodDayPricingSnapshot {
  const snapshot = periodRecordToSnapshot(period);
  const pricing = resolveVillaPeriodPricing({
    nightlyPrice: period.nightlyPrice,
    nightlyPriceWithoutCommission: period.nightlyPriceWithoutCommission,
    weeklyPrice: period.weeklyPrice,
    commissionRate: period.commissionRate,
    discount1Rate: discountUpdate.discount1Rate,
    discount2Rate: discountUpdate.discount2Rate,
    extraDiscountAmount: discountUpdate.extraDiscountAmount,
  });

  return {
    ...snapshot,
    discount1Rate: discountUpdate.discount1Rate,
    discount2Rate: discountUpdate.discount2Rate,
    extraDiscountAmount: discountUpdate.extraDiscountAmount,
    discountedNightlyPrice: pricing.discountedNightlyPrice,
  };
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

  const periodStartKey = dbDateToDateKey(period.startDate);
  const periodEndKey = dbDateToDateKey(period.endDate);
  const rangeStartKey = dbDateToDateKey(editStart);
  const rangeEndKey = dbDateToDateKey(editEnd);
  const rangeStart = dateKeyToDbDate(rangeStartKey);
  const rangeEnd = dateKeyToDbDate(rangeEndKey);
  const periodEnd = dateKeyToDbDate(periodEndKey);

  if (rangeStartKey < periodStartKey || rangeEndKey > periodEndKey) {
    throw new Error("Düzenleme aralığı periyot sınırları içinde olmalı");
  }

  const oldSnapshot = periodRecordToSnapshot(period);
  const hasBefore = rangeStartKey > periodStartKey;
  const hasAfter = rangeEndKey < periodEndKey;

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

  const beforeEnd = hasBefore
    ? dateKeyToDbDate(offsetDateKey(rangeStartKey, -1))
    : null;
  const afterStart = hasAfter
    ? dateKeyToDbDate(offsetDateKey(rangeEndKey, 1))
    : null;

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
