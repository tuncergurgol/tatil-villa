import type { BookingFilters } from "@/lib/booking-filter-types";
import type { AdminBookingListItem } from "@/lib/booking-display";
import { formatBookingReservationNo } from "@/lib/booking-display";
import { matchesBookingQuickFilter } from "@/lib/booking-calendar-days";
import { includesSearchText } from "@/lib/search-text";

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
    if (filters.status && booking.status !== filters.status) {
      return false;
    }

    if (!matchesBookingQuickFilter(booking, filters.quickFilter)) {
      return false;
    }

    if (!includesSearchText(booking.guestName, filters.customerName)) {
      return false;
    }

    if (!includesSearchText(booking.guestEmail, filters.email)) {
      return false;
    }

    if (!includesSearchText(booking.guestPhone, filters.phone)) {
      return false;
    }

    if (filters.selectedVillaIds.length > 0) {
      if (!filters.selectedVillaIds.includes(booking.villa.id)) {
        return false;
      }
    } else if (
      !includesSearchText(
        [
          booking.villa.name,
          booking.villa.originalName,
          booking.villa.slug,
        ].join(" "),
        filters.villaSearch
      )
    ) {
      return false;
    }

    if (
      !includesSearchText(
        [
          booking.id,
          formatBookingReservationNo(booking),
          booking.externalCode != null ? String(booking.externalCode) : "",
        ].join(" "),
        filters.reservationNo
      )
    ) {
      return false;
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

    if (filters.paymentDateStart || filters.paymentDateEnd) {
      // Rezervasyonlar listesinde alan yoksa bu filtreyi yok say.
      if (booking.ownerPaymentDueAt !== undefined) {
        if (!booking.ownerPaymentDueAt) {
          return false;
        }
        if (
          !isDateWithinRange(
            booking.ownerPaymentDueAt,
            filters.paymentDateStart,
            filters.paymentDateEnd
          )
        ) {
          return false;
        }
      }
    }

    return true;
  });
}
