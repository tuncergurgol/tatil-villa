import { prisma } from "@/lib/db";
import {
  buildDaySnapshotsForPeriod,
  buildOccupancyByDateKey,
  mapTatildeyizPropertyPeriods,
  mappedPeriodToPeriodData,
} from "@/lib/tatildeyiz-period-import";
import { fetchTatildeyizPropertyWithDelay } from "@/lib/tatildeyiz-property";
import { dateKeyToDbDate, toDateKey } from "@/lib/villa-period-calendar";

export type VillaPeriodImportResult = {
  periodCount: number;
  dayCount: number;
  bookedDays: number;
  optionDays: number;
};

function countOccupancyDays(
  periods: ReturnType<typeof mapTatildeyizPropertyPeriods>,
  occupancyByDateKey: Map<string, "EMPTY" | "BOOKED" | "OPTION">
) {
  let dayCount = 0;
  let bookedDays = 0;
  let optionDays = 0;

  for (const period of periods) {
    const snapshots = buildDaySnapshotsForPeriod(period, occupancyByDateKey);
    dayCount += snapshots.length;

    for (const item of snapshots) {
      if (item.snapshot.occupancyStatus === "BOOKED") bookedDays += 1;
      if (item.snapshot.occupancyStatus === "OPTION") optionDays += 1;
    }
  }

  return { dayCount, bookedDays, optionDays };
}

export async function importVillaPeriodsFromTatildeyiz(
  villaId: string,
  slug: string
): Promise<VillaPeriodImportResult> {
  const property = await fetchTatildeyizPropertyWithDelay(slug);
  const periods = mapTatildeyizPropertyPeriods(property);
  const occupancyByDateKey = buildOccupancyByDateKey(property);
  const { dayCount, bookedDays, optionDays } = countOccupancyDays(
    periods,
    occupancyByDateKey
  );

  if (periods.length === 0) {
    throw new Error("Tatildeyiz'den periyot bulunamadı");
  }

  await prisma.$transaction(async (tx) => {
    await tx.villaPricePeriodDay.deleteMany({ where: { villaId } });
    await tx.villaPricePeriod.deleteMany({ where: { villaId } });

    for (const mapped of periods) {
      const periodData = mappedPeriodToPeriodData(mapped);
      const created = await tx.villaPricePeriod.create({
        data: {
          villaId,
          ...periodData,
          startDate: dateKeyToDbDate(toDateKey(mapped.startDate)),
          endDate: dateKeyToDbDate(toDateKey(mapped.endDate)),
        },
      });

      const snapshots = buildDaySnapshotsForPeriod(mapped, occupancyByDateKey);
      if (snapshots.length === 0) continue;

      await tx.villaPricePeriodDay.createMany({
        data: snapshots.map(({ dateKey, snapshot }) => ({
          periodId: created.id,
          villaId,
          date: dateKeyToDbDate(dateKey),
          ...snapshot,
          occupancyStatus: snapshot.occupancyStatus ?? "EMPTY",
        })),
        skipDuplicates: true,
      });
    }
  });

  return {
    periodCount: periods.length,
    dayCount,
    bookedDays,
    optionDays,
  };
}
