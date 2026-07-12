import { prisma } from "@/lib/db";
import type { Prisma, VillaDayOccupancy } from "@prisma/client";
import {
  compareDates,
  parseDateKey,
  startOfDay,
  toDateKey,
  toDbDate,
} from "@/lib/villa-period-calendar";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";
import { resolveDayDiscountedPrice } from "@/lib/villa-period-pricing";

function enumerateDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (compareDates(cursor, end) <= 0) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function syncVillaPricePeriodDays(
  periodId: string,
  villaId: string,
  startDate: Date,
  endDate: Date,
  snapshot: VillaPeriodDayPricingSnapshot
) {
  const dates = enumerateDates(startDate, endDate);
  const dbDates = dates.map((date) => toDbDate(date));
  const dateKeys = dates.map((date) => toDateKey(date));

  await prisma.$transaction(async (tx) => {
    await tx.villaPricePeriodDay.deleteMany({
      where: {
        villaId,
        date: { in: dbDates },
      },
    });

    if (dbDates.length === 0) return;

    await tx.villaPricePeriodDay.createMany({
      data: dates.map((date) => {
        const daySnapshot = buildDaySnapshotForDate(
          snapshot,
          date,
          snapshot.occupancyStatus ?? "EMPTY"
        );

        return {
          periodId,
          villaId,
          date: toDbDate(date),
          ...daySnapshot,
          occupancyStatus: daySnapshot.occupancyStatus ?? "EMPTY",
        };
      }),
    });
  });

  return dateKeys;
}

function isWeekendDate(
  snapshot: VillaPeriodDayPricingSnapshot,
  date: Date
): boolean {
  const day = date.getDay();
  return (
    snapshot.weekendPrice != null &&
    snapshot.weekendDays.length > 0 &&
    snapshot.weekendDays.includes(day)
  );
}

export function buildDaySnapshotForDate(
  snapshot: VillaPeriodDayPricingSnapshot,
  date: Date,
  occupancyStatus?: VillaDayOccupancy
): VillaPeriodDayPricingSnapshot {
  const weekend = isWeekendDate(snapshot, date);

  const nightlyPrice = weekend ? snapshot.weekendPrice! : snapshot.nightlyPrice;

  return {
    ...snapshot,
    nightlyPrice,
    discountedNightlyPrice: resolveDayDiscountedPrice(
      nightlyPrice,
      snapshot.discount1Rate,
      snapshot.discount2Rate,
      snapshot.extraDiscountAmount
    ),
    occupancyStatus: occupancyStatus ?? snapshot.occupancyStatus ?? "EMPTY",
  };
}

export async function updateVillaPricePeriodDaysInRange(
  periodId: string,
  villaId: string,
  startDate: Date,
  endDate: Date,
  snapshot: VillaPeriodDayPricingSnapshot
) {
  await prisma.$transaction(async (tx) => {
    await reassignPeriodDaysInRange(
      tx,
      periodId,
      villaId,
      startDate,
      endDate,
      snapshot
    );
  });
}

export async function reassignPeriodDaysInRange(
  tx: Prisma.TransactionClient,
  periodId: string,
  villaId: string,
  startDate: Date,
  endDate: Date,
  snapshot: VillaPeriodDayPricingSnapshot
) {
  const dates = enumerateDates(startDate, endDate);

  for (const date of dates) {
    const dbDate = toDbDate(date);
    const existing = await tx.villaPricePeriodDay.findFirst({
      where: {
        villaId,
        date: dbDate,
      },
      select: {
        id: true,
        occupancyStatus: true,
        availability: true,
      },
    });

    const daySnapshot = buildDaySnapshotForDate(
      snapshot,
      date,
      existing?.occupancyStatus
    );

    const {
      occupancyStatus: _occupancy,
      availability: dayAvailability,
      ...pricingData
    } = daySnapshot;

    if (existing) {
      await tx.villaPricePeriodDay.update({
        where: { id: existing.id },
        data: {
          periodId,
          ...pricingData,
          availability: existing.availability,
          occupancyStatus: existing.occupancyStatus,
        },
      });
      continue;
    }

    await tx.villaPricePeriodDay.create({
      data: {
        periodId,
        villaId,
        date,
        ...pricingData,
        availability: dayAvailability,
        occupancyStatus: daySnapshot.occupancyStatus ?? "EMPTY",
      },
    });
  }
}

export async function reassignPeriodDaysDiscountInRange(
  tx: Prisma.TransactionClient,
  periodId: string,
  villaId: string,
  startDate: Date,
  endDate: Date,
  discountUpdate: {
    discount1Rate: number | null;
    discount2Rate: number | null;
    extraDiscountAmount: number | null;
  }
) {
  const dates = enumerateDates(startDate, endDate);

  for (const date of dates) {
    const dbDate = toDbDate(date);
    const existing = await tx.villaPricePeriodDay.findFirst({
      where: {
        villaId,
        date: dbDate,
      },
    });

    if (!existing) continue;

    const discountedNightlyPrice = resolveDayDiscountedPrice(
      existing.nightlyPrice,
      discountUpdate.discount1Rate,
      discountUpdate.discount2Rate,
      discountUpdate.extraDiscountAmount
    );

    await tx.villaPricePeriodDay.update({
      where: { id: existing.id },
      data: {
        periodId,
        discount1Rate: discountUpdate.discount1Rate,
        discount2Rate: discountUpdate.discount2Rate,
        extraDiscountAmount: discountUpdate.extraDiscountAmount,
        discountedNightlyPrice,
      },
    });
  }
}

export async function deleteVillaPricePeriodDays(periodId: string) {
  await prisma.villaPricePeriodDay.deleteMany({
    where: { periodId },
  });
}

export async function backfillVillaPricePeriodDays(villaId: string) {
  const periods = await prisma.villaPricePeriod.findMany({
    where: { villaId },
    orderBy: { startDate: "asc" },
  });

  for (const period of periods) {
    await syncVillaPricePeriodDays(
      period.id,
      villaId,
      period.startDate,
      period.endDate,
      {
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
      }
    );
  }
}

export function buildPreviewDateKeys(startRaw: string, endRaw: string): string[] {
  if (!startRaw || !endRaw) return [];
  try {
    const startDate = startOfDay(parseDateKey(startRaw));
    const endDate = startOfDay(parseDateKey(endRaw));
    if (compareDates(startDate, endDate) > 0) return [];
    return enumerateDates(startDate, endDate).map((date) => toDateKey(date));
  } catch {
    return [];
  }
}
