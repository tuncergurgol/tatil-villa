import { prisma } from "@/lib/db";
import type { VillaDayOccupancy } from "@prisma/client";
import {
  compareDates,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "@/lib/villa-period-calendar";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";

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
  const dateKeys = dates.map((date) => toDateKey(date));

  await prisma.$transaction(async (tx) => {
    await tx.villaPricePeriodDay.deleteMany({
      where: {
        villaId,
        date: { in: dates },
      },
    });

    if (dates.length === 0) return;

    await tx.villaPricePeriodDay.createMany({
      data: dates.map((date) => ({
        periodId,
        villaId,
        date,
        ...snapshot,
        occupancyStatus: snapshot.occupancyStatus ?? "EMPTY",
      })),
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

  return {
    ...snapshot,
    nightlyPrice: weekend ? snapshot.weekendPrice! : snapshot.nightlyPrice,
    discountedNightlyPrice: weekend
      ? snapshot.weekendPrice!
      : snapshot.discountedNightlyPrice,
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
  const dates = enumerateDates(startDate, endDate);

  await prisma.$transaction(async (tx) => {
    for (const date of dates) {
      const existing = await tx.villaPricePeriodDay.findFirst({
        where: {
          villaId,
          periodId,
          date,
        },
        select: {
          id: true,
          occupancyStatus: true,
          availability: true,
        },
      });

      if (!existing) continue;

      const daySnapshot = buildDaySnapshotForDate(
        snapshot,
        date,
        existing.occupancyStatus
      );

      const { occupancyStatus: _occupancy, availability: _availability, ...pricingData } =
        daySnapshot;

      await tx.villaPricePeriodDay.update({
        where: { id: existing.id },
        data: {
          ...pricingData,
          availability: existing.availability,
          occupancyStatus: existing.occupancyStatus,
        },
      });
    }
  });
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
