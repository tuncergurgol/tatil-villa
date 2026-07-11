import type { VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import {
  buildBookedOccupancyForStay,
  buildEmptyOccupancyForRange,
  enumerateDateKeysInRange,
  normalizeDateRange,
  offsetDateKey,
} from "@/lib/villa-period-selection";

export type OccupancyApplyMode = "EMPTY" | "BOOKED" | "OPTION";

function buildOptionOccupancyForRange(
  startKey: string,
  endKey: string
): Map<string, VillaDayOccupancy> {
  const map = new Map<string, VillaDayOccupancy>();
  for (const dateKey of enumerateDateKeysInRange(startKey, endKey)) {
    map.set(dateKey, "OPTION");
  }
  return map;
}

export async function applyVillaPeriodDaysOccupancy(
  villaId: string,
  startDateKey: string,
  endDateKey: string,
  mode: OccupancyApplyMode
): Promise<{ updatedDays: number }> {
  const { start, end } = normalizeDateRange(startDateKey, endDateKey);
  const rangeDateKeys = enumerateDateKeysInRange(start, end);
  const lookupDateKeys = [
    ...new Set([
      ...rangeDateKeys,
      offsetDateKey(start, -1),
      offsetDateKey(end, 1),
    ]),
  ];

  const existingDays = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId,
      date: { in: lookupDateKeys.map((dateKey) => dateKeyToDbDate(dateKey)) },
    },
    select: {
      date: true,
      occupancyStatus: true,
    },
  });

  const existingOccupancyByDateKey = new Map<string, VillaDayOccupancy>();
  for (const day of existingDays) {
    existingOccupancyByDateKey.set(
      dbDateToDateKey(day.date),
      day.occupancyStatus
    );
  }

  const occupancyByDateKey: Map<string, VillaDayOccupancy> =
    mode === "BOOKED"
      ? buildBookedOccupancyForStay(start, end, existingOccupancyByDateKey)
      : mode === "OPTION"
        ? buildOptionOccupancyForRange(start, end)
        : buildEmptyOccupancyForRange(start, end, existingOccupancyByDateKey);

  const updates = [...occupancyByDateKey.entries()]
    .filter(([dateKey, occupancyStatus]) => {
      const existing = existingOccupancyByDateKey.get(dateKey) ?? "EMPTY";
      return existing !== occupancyStatus;
    })
    .map(([dateKey, occupancyStatus]) =>
      prisma.villaPricePeriodDay.updateMany({
        where: {
          villaId,
          date: dateKeyToDbDate(dateKey),
        },
        data: { occupancyStatus },
      })
    );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return { updatedDays: updates.length };
}
