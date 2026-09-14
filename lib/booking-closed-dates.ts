import { BookingStatus } from "@prisma/client";

/** Ön ödeme / konfirme aksiyonlarında kapalı tarih engeli */
export const BOOKING_CLOSED_DATES_ACTION_ERROR =
  "KAPALI TARİHLERE İŞLEM YAPILAMAZ, LÜTFEN KONTROL EDİN";

/** Yarım-açık konaklama aralığı: [checkIn, checkOut) */
export function staysDateRangesOverlap(
  checkInA: string,
  checkOutA: string,
  checkInB: string,
  checkOutB: string
): boolean {
  return checkInA < checkOutB && checkOutA > checkInB;
}

/**
 * Aksiyon engeli (saf mantık):
 * - Başka çakışan talep/rezervasyon → engelle
 * - Takvim BOOKED/OPTION gece → engelle (CONFIRMED kendi BOOKED gecelerini saymaz)
 */
export function shouldBlockBookingActionForClosedDates(input: {
  bookingStatus: BookingStatus;
  hasOverlappingOtherBooking: boolean;
  nightOccupancyStatuses: Array<"EMPTY" | "BOOKED" | "OPTION" | string | null | undefined>;
}): boolean {
  if (input.hasOverlappingOtherBooking) return true;

  // Onaylı rezervasyon takvimde kendi gecelerini BOOKED yapar; kendini kapalı sayma
  if (input.bookingStatus === BookingStatus.CONFIRMED) return false;

  return input.nightOccupancyStatuses.some(
    (status) => status === "BOOKED" || status === "OPTION"
  );
}

/** Client: kapalı tarih hatasında görünür popup */
export function alertBookingClosedDatesError(error: string): boolean {
  if (error !== BOOKING_CLOSED_DATES_ACTION_ERROR) return false;
  if (typeof window !== "undefined") {
    window.alert(error);
  }
  return true;
}
