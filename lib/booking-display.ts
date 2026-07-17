import { calculateNights } from "@/lib/stay-nights";
import { BOOKING_STATUS_META } from "@/lib/booking-status";
import type { BookingStatus } from "@prisma/client";

const WEEKDAY_SHORT = ["Paz", "Pts", "Sal", "Çar", "Per", "Cum", "Cts"] as const;

export type AdminBookingListItem = {
  id: string;
  externalCode: number | null;
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
  optionExpiresAt: Date | null;
  /** details.prepaymentAmount — talep/formdan gelen gerçek ön ödeme */
  prepaymentAmount: number | null;
  /** details.importPaymentMethod / paymentMethod */
  paymentMethod: string | null;
  /** details.siteInfo — talebin geldiği site adı */
  siteInfo: string;
  /** Site domain (AgencySite / originDomain / şirket fallback) */
  siteDomain: string;
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

/** Rezervasyon No — yalnızca externalCode (eski sahte #/KOD üretimi yok). */
export function formatBookingReservationNo(
  booking: Pick<AdminBookingListItem, "externalCode"> | number | null | undefined
): string {
  const code =
    typeof booking === "number" || booking == null || typeof booking === "undefined"
      ? booking
      : booking.externalCode;
  return code != null ? String(code) : "—";
}

/** @deprecated Rezervasyon KOD kaldırıldı; formatBookingReservationNo kullanın. */
export function formatBookingDisplayNumber(
  booking: Pick<AdminBookingListItem, "externalCode" | "id"> | string
): string {
  if (typeof booking === "string") return "—";
  return formatBookingReservationNo(booking);
}

/** @deprecated Rezervasyon KOD pasif. */
export function formatBookingShortCode(_id: string): string {
  return "";
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

/** @deprecated Gerçek tutar için booking.prepaymentAmount kullanın */
export function estimatePrepaymentAmount(totalPrice: number | null): number | null {
  if (totalPrice == null || totalPrice <= 0) return null;
  return Math.round(totalPrice * 0.184);
}

export function resolveBookingPrepaymentAmount(
  booking: Pick<AdminBookingListItem, "prepaymentAmount" | "totalPrice">
): number | null {
  if (booking.prepaymentAmount != null && booking.prepaymentAmount > 0) {
    return booking.prepaymentAmount;
  }
  return null;
}

export function resolvePaymentMethodLabel(
  paymentMethod: string | null | undefined
): string {
  if (!paymentMethod?.trim()) return "—";
  const value = paymentMethod.trim();
  if (value === "bank_transfer" || value === "transfer") return "Havale / EFT";
  if (value === "credit_card" || value === "card") return "Kredi Kartı";
  return value;
}

/** @deprecated resolvePaymentMethodLabel kullanın */
export function resolvePaymentMethod(id: string): string {
  const hash = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? "Havale / EFT" : "Kredi Kartı";
}

export function formatMoneyPlain(amount: number): string {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("tr-TR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })} TL`;
}

/** Input alanları için kuruşsuz, binlik ayraçlı tutar (döviz cinsi yok). */
export function formatMoneyInputValue(amount: number): string {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("tr-TR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function formatFacilityCode(villa: AdminBookingListItem["villa"]): string {
  if (villa.documentNo.trim()) return `#${villa.documentNo.trim()}`;
  const digits = villa.id.replace(/\D/g, "").slice(-4);
  return `#${digits || "0000"}`;
}
