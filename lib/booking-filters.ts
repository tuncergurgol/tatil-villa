import type { BookingFilters } from "@/components/admin/bookings/BookingFilterModal";
import type { AdminBookingListItem } from "@/lib/booking-display";
import {
  formatBookingDisplayNumber,
  formatBookingShortCode,
  resolveBookingDisplayStatus,
} from "@/lib/booking-display";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function matchesContains(haystack: string, needle: string) {
  if (!needle) return true;
  return normalize(haystack).includes(normalize(needle));
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return startOfDay(value);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function matchesQuickFilter(
  booking: AdminBookingListItem,
  quickFilter: BookingFilters["quickFilter"]
): boolean {
  if (!quickFilter) return true;
  if (resolveBookingDisplayStatus(booking) !== "confirmed") return false;

  const today = startOfDay(new Date());

  switch (quickFilter) {
    case "check_in_today":
      return isSameCalendarDay(booking.checkIn, today);
    case "check_in_1_day":
      return isSameCalendarDay(booking.checkIn, addDays(today, 1));
    case "check_in_2_days":
      return isSameCalendarDay(booking.checkIn, addDays(today, 2));
    case "check_out_today":
      return isSameCalendarDay(booking.checkOut, today);
    case "check_out_1_day":
      return isSameCalendarDay(booking.checkOut, addDays(today, 1));
    case "check_out_2_days":
      return isSameCalendarDay(booking.checkOut, addDays(today, 2));
    default:
      return true;
  }
}

function isDateWithinRange(
  date: Date,
  startRaw?: string,
  endRaw?: string
): boolean {
  if (startRaw) {
    const start = new Date(`${startRaw}T00:00:00`);
    if (date < start) return false;
  }
  if (endRaw) {
    const end = new Date(`${endRaw}T23:59:59.999`);
    if (date > end) return false;
  }
  return true;
}

export function filterBookings(
  bookings: AdminBookingListItem[],
  filters: BookingFilters
) {
  return bookings.filter((booking) => {
    if (!matchesQuickFilter(booking, filters.quickFilter)) {
      return false;
    }

    if (!matchesContains(booking.guestName, filters.customerName)) {
      return false;
    }

    if (!matchesContains(booking.guestEmail, filters.email)) {
      return false;
    }

    if (!matchesContains(booking.guestPhone, filters.phone)) {
      return false;
    }

    if (filters.selectedVillaIds.length > 0) {
      if (!filters.selectedVillaIds.includes(booking.villa.id)) {
        return false;
      }
    } else if (filters.villaSearch.trim()) {
      const query = normalize(filters.villaSearch);
      const villaHaystack = [
        booking.villa.name,
        booking.villa.originalName,
        booking.villa.slug,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      if (!villaHaystack.includes(query)) return false;
    }

    if (filters.reservationNo.trim()) {
      const query = normalize(filters.reservationNo);
      const reservationHaystack = [
        booking.id,
        formatBookingDisplayNumber(booking.id),
        formatBookingShortCode(booking.id),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      if (!reservationHaystack.includes(query)) return false;
    }

    if (
      !isDateWithinRange(
        booking.createdAt,
        filters.reservationDateStart,
        filters.reservationDateEnd
      )
    ) {
      return false;
    }

    if (
      !isDateWithinRange(booking.checkIn, filters.checkInStart, filters.checkInEnd)
    ) {
      return false;
    }

    if (
      !isDateWithinRange(
        booking.checkOut,
        filters.checkOutStart,
        filters.checkOutEnd
      )
    ) {
      return false;
    }

    return true;
  });
}
