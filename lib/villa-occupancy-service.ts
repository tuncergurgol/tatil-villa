import type { BookingStatus, VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import { assertNoConfirmedBookingOverlap } from "@/lib/villa-confirmed-booking-guard";
import {
  buildBookedOccupancyForStay,
  buildEmptyOccupancyForRange,
  buildOptionOccupancyForStay,
  buildReservedOccupancyForStay,
  enumerateDateKeysInRange,
  normalizeDateRange,
  offsetDateKey,
} from "@/lib/villa-period-selection";

export type OccupancyApplyMode = "EMPTY" | "BOOKED" | "RESERVED" | "OPTION";

export async function applyVillaPeriodDaysOccupancy(
  villaId: string,
  startDateKey: string,
  endDateKey: string,
  mode: OccupancyApplyMode
): Promise<{ updatedDays: number }> {
  if (mode !== "RESERVED") {
    await assertNoConfirmedBookingOverlap(villaId, startDateKey, endDateKey, {
      applyMode: mode === "BOOKED" || mode === "OPTION" ? mode : "EMPTY",
    });
  }

  const { start, end } = normalizeDateRange(startDateKey, endDateKey);
  const rangeDateKeys = enumerateDateKeysInRange(start, end);
  const rangeDateKeySet = new Set(rangeDateKeys);
  const lookupDateKeys = new Set<string>([
    ...rangeDateKeys,
    offsetDateKey(start, -1),
    offsetDateKey(end, 1),
  ]);

  const existingDays = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId,
      date: {
        in: [...lookupDateKeys].map((dateKey) => dateKeyToDbDate(dateKey)),
      },
    },
    select: {
      date: true,
      occupancyStatus: true,
      occupancyCheckIn: true,
    },
  });

  const existingOccupancyByDateKey = new Map<string, VillaDayOccupancy>();
  const existingCheckInByDateKey = new Map<string, boolean>();
  for (const day of existingDays) {
    const dateKey = dbDateToDateKey(day.date);
    existingOccupancyByDateKey.set(dateKey, day.occupancyStatus);
    existingCheckInByDateKey.set(dateKey, day.occupancyCheckIn);
  }

  const occupancyByDateKey: Map<string, VillaDayOccupancy> =
    mode === "BOOKED"
      ? buildBookedOccupancyForStay(start, end, existingOccupancyByDateKey)
      : mode === "RESERVED"
        ? buildReservedOccupancyForStay(start, end, existingOccupancyByDateKey)
        : mode === "OPTION"
          ? buildOptionOccupancyForStay(start, end, existingOccupancyByDateKey)
          : buildEmptyOccupancyForRange(start, end, existingOccupancyByDateKey);

  const updates = [...occupancyByDateKey.entries()]
    .filter(([dateKey, occupancyStatus]) => {
      if (!rangeDateKeySet.has(dateKey)) return false;
      const existing = existingOccupancyByDateKey.get(dateKey) ?? "EMPTY";
      const existingCheckIn = existingCheckInByDateKey.get(dateKey) ?? false;
      const nextCheckIn =
        mode === "EMPTY"
          ? false
          : dateKey === start
            ? true
            : dateKey === end && isOccupiedOccupancy(existing)
              ? existingCheckIn
              : false;
      return existing !== occupancyStatus || existingCheckIn !== nextCheckIn;
    })
    .map(([dateKey, occupancyStatus]) => {
      const existing = existingOccupancyByDateKey.get(dateKey) ?? "EMPTY";
      const nextCheckIn =
        mode === "EMPTY"
          ? false
          : dateKey === start
            ? true
            : dateKey === end && isOccupiedOccupancy(existing)
              ? (existingCheckInByDateKey.get(dateKey) ?? false)
              : false;
      return prisma.villaPricePeriodDay.updateMany({
        where: {
          villaId,
          date: dateKeyToDbDate(dateKey),
        },
        data: { occupancyStatus, occupancyCheckIn: nextCheckIn },
      });
    });

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return { updatedDays: updates.length };
}

function isOccupiedOccupancy(status: VillaDayOccupancy): boolean {
  return status === "BOOKED" || status === "RESERVED" || status === "OPTION";
}

/**
 * Rezervasyon durum / tarih değişiminde takvim doluluğunu senkronlar.
 * - ONAYLANDI → İPTAL: giriş–çıkış aralığını (check-in dahil, check-out hariç) açar
 * - ONAYLANDI olurken: aynı kurala göre BOOKED yazar
 * - ONAYLANDI kalıp tarihler değişirse: eski aralığı açar, yeniyi BOOKED yapar
 */
export async function syncBookingStayOccupancy(input: {
  villaId: string;
  previous: {
    status: BookingStatus;
    checkIn: Date;
    checkOut: Date;
  };
  next: {
    status: BookingStatus;
    checkIn: Date;
    checkOut: Date;
  };
}): Promise<void> {
  const prevIn = dbDateToDateKey(input.previous.checkIn);
  const prevOut = dbDateToDateKey(input.previous.checkOut);
  const nextIn = dbDateToDateKey(input.next.checkIn);
  const nextOut = dbDateToDateKey(input.next.checkOut);

  const wasConfirmed = input.previous.status === "CONFIRMED";
  const isConfirmed = input.next.status === "CONFIRMED";
  const isCancelled = input.next.status === "CANCELLED";

  if (wasConfirmed && isCancelled) {
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      prevIn,
      prevOut,
      "EMPTY"
    );
    return;
  }

  if (wasConfirmed && isConfirmed) {
    if (prevIn === nextIn && prevOut === nextOut) return;
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      prevIn,
      prevOut,
      "EMPTY"
    );
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      nextIn,
      nextOut,
      "RESERVED"
    );
    return;
  }

  if (!wasConfirmed && isConfirmed) {
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      nextIn,
      nextOut,
      "RESERVED"
    );
  }
}
