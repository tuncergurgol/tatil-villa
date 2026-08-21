import type { VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildDaySnapshotsForPeriod,
  mappedPeriodToPeriodData,
  type MappedVillaPricePeriod,
} from "@/lib/tatildeyiz-period-import";
import { dateKeyToDbDate, toDateKey } from "@/lib/villa-period-calendar";
import { loadConfirmedBookingProtectedDateKeys } from "@/lib/confirmed-booking-occupancy-guard";

export const PERIOD_IMPORT_TX_OPTIONS = {
  maxWait: 15_000,
  timeout: 120_000,
} as const;

const PERIOD_DAY_BATCH_SIZE = 250;

export async function persistVillaPricePeriods(input: {
  villaId: string;
  periods: MappedVillaPricePeriod[];
  occupancyByDateKey: Map<string, VillaDayOccupancy>;
}) {
  const protectedDateKeys = await loadConfirmedBookingProtectedDateKeys(
    input.villaId
  );
  const occupancyByDateKey = new Map(input.occupancyByDateKey);
  for (const dateKey of protectedDateKeys) {
    occupancyByDateKey.set(dateKey, "RESERVED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.villaPricePeriodDay.deleteMany({ where: { villaId: input.villaId } });
    await tx.villaPricePeriod.deleteMany({ where: { villaId: input.villaId } });

    for (const mapped of input.periods) {
      const periodData = mappedPeriodToPeriodData(mapped);
      const created = await tx.villaPricePeriod.create({
        data: {
          villaId: input.villaId,
          ...periodData,
          startDate: dateKeyToDbDate(toDateKey(mapped.startDate)),
          endDate: dateKeyToDbDate(toDateKey(mapped.endDate)),
        },
      });

      const snapshots = buildDaySnapshotsForPeriod(mapped, occupancyByDateKey);
      if (snapshots.length === 0) continue;

      for (let index = 0; index < snapshots.length; index += PERIOD_DAY_BATCH_SIZE) {
        const batch = snapshots.slice(index, index + PERIOD_DAY_BATCH_SIZE);
        await tx.villaPricePeriodDay.createMany({
          data: batch.map(({ dateKey, snapshot }) => ({
            periodId: created.id,
            villaId: input.villaId,
            date: dateKeyToDbDate(dateKey),
            ...snapshot,
            occupancyStatus: snapshot.occupancyStatus ?? "EMPTY",
          })),
          skipDuplicates: true,
        });
      }
    }
  }, PERIOD_IMPORT_TX_OPTIONS);
}
