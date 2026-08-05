import { prisma } from "@/lib/db";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import { normalizeDateRange } from "@/lib/villa-period-selection";

export const CONFIRMED_BOOKING_OCCUPANCY_LOCKED_CODE =
  "CONFIRMED_BOOKING_OCCUPANCY_LOCKED" as const;

export type ConfirmedBookingOverlap = {
  bookingLabel: string;
  checkInKey: string;
  checkOutKey: string;
};

function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a = normalizeDateRange(aStart, aEnd);
  const b = normalizeDateRange(bStart, bEnd);
  return a.start <= b.end && b.start <= a.end;
}

/** Seçilen aralık onaylı (CONFIRMED) rezervasyon tarihlerine dokunuyor mu? */
export async function findConfirmedBookingOverlap(
  villaId: string,
  startDateKey: string,
  endDateKey: string
): Promise<ConfirmedBookingOverlap | null> {
  const bookings = await prisma.booking.findMany({
    where: {
      villaId,
      status: "CONFIRMED",
    },
    select: {
      externalCode: true,
      checkIn: true,
      checkOut: true,
    },
  });

  for (const booking of bookings) {
    const checkInKey = dbDateToDateKey(booking.checkIn);
    const checkOutKey = dbDateToDateKey(booking.checkOut);
    if (
      dateRangesOverlap(startDateKey, endDateKey, checkInKey, checkOutKey)
    ) {
      return {
        bookingLabel:
          booking.externalCode != null
            ? `#${booking.externalCode}`
            : "Onaylı rezervasyon",
        checkInKey,
        checkOutKey,
      };
    }
  }

  return null;
}

export function formatConfirmedBookingOccupancyLockMessage(
  overlap: ConfirmedBookingOverlap
): string {
  return `Onaylı rezervasyon (${overlap.bookingLabel}) tarihleri değiştirilemez. Rezervasyon durumu "Onaylandı" iken bu günlerde açma veya kapatma yapılamaz.`;
}

export class ConfirmedBookingOccupancyLockedError extends Error {
  readonly code = CONFIRMED_BOOKING_OCCUPANCY_LOCKED_CODE;

  constructor(public readonly overlap: ConfirmedBookingOverlap) {
    super(formatConfirmedBookingOccupancyLockMessage(overlap));
    this.name = "ConfirmedBookingOccupancyLockedError";
  }
}

export async function assertNoConfirmedBookingOverlap(
  villaId: string,
  startDateKey: string,
  endDateKey: string
): Promise<void> {
  const overlap = await findConfirmedBookingOverlap(
    villaId,
    startDateKey,
    endDateKey
  );
  if (overlap) {
    throw new ConfirmedBookingOccupancyLockedError(overlap);
  }
}
