import { BookingStatus } from "@prisma/client";
import { calculateNights } from "@/lib/queries/bookings";

const WEEKDAY_SHORT = ["Paz", "Pts", "Sal", "Çar", "Per", "Cum", "Cts"] as const;

export type BookingDisplayStatus =
  | "cancelled"
  | "prepayment"
  | "new"
  | "confirmed";

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
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
  };
};

export function formatBookingDisplayNumber(id: string): string {
  const digits = id.replace(/\D/g, "");
  const value = Number(digits.slice(-5) || "0") % 90000;
  return `#${String(30000 + value).padStart(5, "0")}`;
}

export function formatBookingShortCode(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
}

export function resolveBookingDisplayStatus(
  booking: Pick<AdminBookingListItem, "status" | "createdAt" | "totalPrice">
): BookingDisplayStatus {
  if (booking.status === BookingStatus.CANCELLED) return "cancelled";
  if (booking.status === BookingStatus.CONFIRMED) return "confirmed";
  if (
    booking.totalPrice != null &&
    Date.now() - booking.createdAt.getTime() > 24 * 60 * 60 * 1000
  ) {
    return "prepayment";
  }
  return "new";
}

export const BOOKING_STATUS_META: Record<
  BookingDisplayStatus,
  { label: string; className: string }
> = {
  cancelled: {
    label: "İptal",
    className: "bg-red-100 text-red-700",
  },
  prepayment: {
    label: "Ön Ödeme",
    className: "bg-amber-100 text-amber-800",
  },
  new: {
    label: "Yeni Rezervasyon",
    className: "bg-violet-100 text-violet-700",
  },
  confirmed: {
    label: "Onaylandı",
    className: "bg-emerald-100 text-emerald-700",
  },
};

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
