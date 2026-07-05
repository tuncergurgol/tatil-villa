import { calculateNights } from "@/lib/queries/bookings";
import { BOOKING_STATUS_META } from "@/lib/booking-status";
import type { BookingStatus } from "@prisma/client";

const WEEKDAY_SHORT = ["Paz", "Pts", "Sal", "Çar", "Per", "Cum", "Cts"] as const;

export type AdminBookingListItem = {
  id: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice: number | null;
  status: BookingStatus;
  createdAt: Date;
  villa: {
    id: string;
    villaId: number | null;
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
  };
};

export { BOOKING_STATUS_META };

export function formatBookingDisplayNumber(id: string): string {
  const digits = id.replace(/\D/g, "");
  const value = Number(digits.slice(-5) || "0") % 90000;
  return `#${String(30000 + value).padStart(5, "0")}`;
}

export function formatBookingShortCode(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
}

export function formatStaySummary(checkIn: Date, checkOut: Date) {
  const nights = calculateNights(checkIn, checkOut);
  const dateFmt = (date: Date) =>
    date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return {
    range: `${dateFmt(checkIn)} — ${dateFmt(checkOut)}`,
    weekdays: `${WEEKDAY_SHORT[checkIn.getDay()]} - ${WEEKDAY_SHORT[checkOut.getDay()]}`,
    nights: `${nights} gece`,
    nightsCount: nights,
  };
}

export function formatGuestCounts(booking: Pick<
  AdminBookingListItem,
  "adults" | "children" | "babies" | "pets"
>) {
  return {
    summary: `${booking.adults}/${booking.children}/${booking.babies}`,
    pets: `${booking.pets} pati`,
  };
}

export function estimatePrepaymentAmount(totalPrice: number | null): number | null {
  if (totalPrice == null || totalPrice <= 0) return null;
  return Math.round(totalPrice * 0.184);
}

export function resolvePaymentMethod(id: string): string {
  const hash = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? "Havale / EFT" : "Kredi Kartı";
}

export function formatMoneyPlain(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} TL`;
}

export function formatFacilityCode(villa: AdminBookingListItem["villa"]): string {
  if (villa.documentNo.trim()) return `#${villa.documentNo.trim()}`;
  const digits = villa.id.replace(/\D/g, "").slice(-4);
  return `#${digits || "0000"}`;
}
