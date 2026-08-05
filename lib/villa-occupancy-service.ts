import type { BookingStatus, VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import {
  buildBookedOccupancyForInclusiveRange,
  buildBookedOccupancyForStay,
  buildEmptyOccupancyForInclusiveRange,
  buildEmptyOccupancyForRange,
  buildOptionOccupancyForInclusiveRange,
  buildOptionOccupancyForStay,
  enumerateDateKeysInRange,
  normalizeDateRange,
  offsetDateKey,
} from "@/lib/villa-period-selection";

export type OccupancyApplyMode = "EMPTY" | "BOOKED" | "OPTION";

/** inclusive: komutun yazdığı günler birebir uygulanır; stay: rezervasyon giriş–çıkış kuralı */
export type OccupancyRangeSemantics = "inclusive" | "stay";

export async function applyVillaPeriodDaysOccupancy(
  villaId: string,
  startDateKey: string,
  endDateKey: string,
  mode: OccupancyApplyMode,
  semantics: OccupancyRangeSemantics = "inclusive"
): Promise<{ updatedDays: number }> {
  const { start, end } = normalizeDateRange(startDateKey, endDateKey);
  const rangeDateKeys = enumerateDateKeysInRange(start, end);
  const rangeDateKeySet = new Set(rangeDateKeys);
  const lookupDateKeys = new Set<string>(
    semantics === "stay"
      ? [
          ...rangeDateKeys,
          offsetDateKey(start, -1),
          offsetDateKey(end, 1),
        ]
      : rangeDateKeys
  );

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
    semantics === "stay"
      ? mode === "BOOKED"
        ? buildBookedOccupancyForStay(start, end, existingOccupancyByDateKey)
        : mode === "OPTION"
          ? buildOptionOccupancyForStay(start, end, existingOccupancyByDateKey)
          : buildEmptyOccupancyForRange(start, end, existingOccupancyByDateKey)
      : mode === "BOOKED"
        ? buildBookedOccupancyForInclusiveRange(start, end)
        : mode === "OPTION"
          ? buildOptionOccupancyForInclusiveRange(start, end)
          : buildEmptyOccupancyForInclusiveRange(start, end);

  const updates = [...occupancyByDateKey.entries()]
    .filter(([dateKey, occupancyStatus]) => {
      if (!rangeDateKeySet.has(dateKey)) return false;
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
      "EMPTY",
      "stay"
    );
    return;
  }

  if (wasConfirmed && isConfirmed) {
    if (prevIn === nextIn && prevOut === nextOut) return;
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      prevIn,
      prevOut,
      "EMPTY",
      "stay"
    );
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      nextIn,
      nextOut,
      "BOOKED",
      "stay"
    );
    return;
  }

  if (!wasConfirmed && isConfirmed) {
    await applyVillaPeriodDaysOccupancy(
      input.villaId,
      nextIn,
      nextOut,
      "BOOKED",
      "stay"
    );
  }
}
