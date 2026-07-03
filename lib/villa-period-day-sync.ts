import { prisma } from "@/lib/db";
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
      })),
    });
  });

  return dateKeys;
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
