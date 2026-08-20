import { staysDateRangesOverlap } from "@/lib/booking-closed-dates";
import { prisma } from "@/lib/db";
import { CONFIRMED_BOOKING_OCCUPANCY_LOCKED_CODE } from "@/lib/villa-confirmed-booking-guard.constants";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import { normalizeDateRange } from "@/lib/villa-period-selection";

export { CONFIRMED_BOOKING_OCCUPANCY_LOCKED_CODE };

export type ConfirmedBookingOverlap = {
  bookingLabel: string;
  checkInKey: string;
  checkOutKey: string;
};

/** Seçilen aralık onaylı rezervasyonun dolu gecelerine dokunuyor mu? Çıkış günü serbest. */
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

  const selection = normalizeDateRange(startDateKey, endDateKey);

  for (const booking of bookings) {
    const checkInKey = dbDateToDateKey(booking.checkIn);
    const checkOutKey = dbDateToDateKey(booking.checkOut);
    if (
      staysDateRangesOverlap(
        selection.start,
        selection.end,
        checkInKey,
        checkOutKey
      )
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
  if (!overlap) return;

  throw new ConfirmedBookingOccupancyLockedError(overlap);
}
