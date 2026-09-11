/**
 * Kapalı tarih engeli — kısa mantık smoke senaryoları.
 * Çalıştır: npx tsx scripts/smoke-booking-closed-dates.ts
 */
import { BookingStatus } from "@prisma/client";
import {
  BOOKING_CLOSED_DATES_ACTION_ERROR,
  shouldBlockBookingActionForClosedDates,
  staysDateRangesOverlap,
} from "../lib/booking-closed-dates";

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`ok — ${label}`);
}

// 13–16 → geceler 13,14,15 (check-out hariç). 16 giriş başka rezervasyona açık.
assert(
  staysDateRangesOverlap("2026-07-13", "2026-07-16", "2026-07-13", "2026-07-16"),
  "aynı aralık çakışır"
);
assert(
  staysDateRangesOverlap("2026-07-13", "2026-07-16", "2026-07-16", "2026-07-20") ===
    false,
  "check-out / check-in aynı gün çakışmaz"
);
assert(
  staysDateRangesOverlap("2026-07-13", "2026-07-16", "2026-07-15", "2026-07-18"),
  "kısmi örtüşme çakışır"
);

// Senaryo: 116004 onaylandı → 13–15 BOOKED; başka OPEN talep aynı tarihler
assert(
  shouldBlockBookingActionForClosedDates({
    bookingStatus: BookingStatus.NEW,
    hasOverlappingOtherBooking: true,
    nightOccupancyStatuses: ["BOOKED", "BOOKED", "BOOKED"],
  }),
  "OPEN talep + onaylı çakışma engellenir"
);
assert(
  shouldBlockBookingActionForClosedDates({
    bookingStatus: BookingStatus.NEW,
    hasOverlappingOtherBooking: false,
    nightOccupancyStatuses: ["BOOKED", "BOOKED", "BOOKED"],
  }),
  "OPEN talep + manual/takvim BOOKED engellenir"
);
assert(
  shouldBlockBookingActionForClosedDates({
    bookingStatus: BookingStatus.CONFIRMED,
    hasOverlappingOtherBooking: false,
    nightOccupancyStatuses: ["BOOKED", "BOOKED", "BOOKED"],
  }) === false,
  "CONFIRMED kendi BOOKED gecelerini saymaz"
);
assert(
  shouldBlockBookingActionForClosedDates({
    bookingStatus: BookingStatus.CONFIRMED,
    hasOverlappingOtherBooking: true,
    nightOccupancyStatuses: ["BOOKED", "BOOKED", "BOOKED"],
  }),
  "CONFIRMED bile başka çakışan talep varsa engellenir"
);
assert(
  shouldBlockBookingActionForClosedDates({
    bookingStatus: BookingStatus.PREPAYMENT,
    hasOverlappingOtherBooking: false,
    nightOccupancyStatuses: ["EMPTY", "EMPTY", "EMPTY"],
  }) === false,
  "boş takvimde yalnız talep serbest"
);

assert(
  BOOKING_CLOSED_DATES_ACTION_ERROR ===
    "KAPALI TARİHLERE İŞLEM YAPILAMAZ, LÜTFEN KONTROL EDİN",
  "hata mesajı sabit"
);

console.log("\nTüm smoke senaryoları geçti.");
