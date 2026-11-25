import { prisma } from "@/lib/db";
import {
  BOOKING_CLOSED_DATES_ACTION_ERROR,
  staysDateRangesOverlap,
} from "@/lib/booking-closed-dates";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-status";
import { isVillaAvailable } from "@/lib/queries/bookings";
import { getStayNightKeys } from "@/lib/stay-quote";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";

export {
  BOOKING_CLOSED_DATES_ACTION_ERROR,
  alertBookingClosedDatesError,
} from "@/lib/booking-closed-dates";

export type AssertBookingDatesOpenResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Ön ödeme paylaş / ön ödeme ekle / konfirme gönder öncesi:
 * kontrol edilen booking hariç tutulur; başka çakışan talep veya
 * BOOKED/OPTION takvim gecesi varsa engeller.
 *
 * Overlap: mevcut booking yarım-açık kuralı (checkIn dahil, checkOut hariç).
 * Occupancy: isVillaAvailable — excludeBookingId kendi [in,out) BOOKED gecelerini saymaz.
 */
export async function assertBookingDatesOpenForActions(
  bookingId: string
): Promise<AssertBookingDatesOpenResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      villaId: true,
      checkIn: true,
      checkOut: true,
      status: true,
    },
  });

  if (!booking) {
    return { ok: false, error: "Rezervasyon bulunamadı" };
  }

  const checkInKey = dbDateToDateKey(booking.checkIn);
  const checkOutKey = dbDateToDateKey(booking.checkOut);
  const nightKeys = getStayNightKeys(checkInKey, checkOutKey);

  if (nightKeys.length === 0) {
    return { ok: false, error: BOOKING_CLOSED_DATES_ACTION_ERROR };
  }

  // Aday aralık geniş; kesin çakışma staysDateRangesOverlap ile
  const candidates = await prisma.booking.findMany({
    where: {
      villaId: booking.villaId,
      id: { not: booking.id },
      status: { in: BOOKING_BLOCKING_STATUSES },
      checkIn: { lt: dateKeyToDbDate(offsetDateKey(checkOutKey, 1)) },
      checkOut: { gt: dateKeyToDbDate(offsetDateKey(checkInKey, -1)) },
    },
    select: { checkIn: true, checkOut: true },
  });

  const hasOverlappingOtherBooking = candidates.some((other) =>
    staysDateRangesOverlap(
      checkInKey,
      checkOutKey,
      dbDateToDateKey(other.checkIn),
      dbDateToDateKey(other.checkOut)
    )
  );

  if (hasOverlappingOtherBooking) {
    return { ok: false, error: BOOKING_CLOSED_DATES_ACTION_ERROR };
  }

  const available = await isVillaAvailable(
    booking.villaId,
    checkInKey,
    checkOutKey,
    booking.id
  );

  if (!available) {
    return { ok: false, error: BOOKING_CLOSED_DATES_ACTION_ERROR };
  }

  return { ok: true };
}
