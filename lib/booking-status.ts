import { BookingStatus } from "@prisma/client";

export const BOOKING_STATUS_ORDER: BookingStatus[] = [
  BookingStatus.NEW,
  BookingStatus.PREPAYMENT,
  BookingStatus.CONFIRMATION_SENT,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPENSATION,
  BookingStatus.CANCELLED,
];

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  [BookingStatus.NEW]: {
    label: "Yeni Rezervasyon",
    className: "bg-violet-100 text-violet-700",
  },
  [BookingStatus.PREPAYMENT]: {
    label: "ÖDEME BEKLENİYOR",
    className: "bg-amber-100 text-amber-800",
  },
  [BookingStatus.CONFIRMATION_SENT]: {
    label: "ONAY BEKLENİYOR",
    className: "bg-sky-100 text-sky-800",
  },
  [BookingStatus.CONFIRMED]: {
    label: "Onaylandı",
    className: "bg-emerald-100 text-emerald-700",
  },
  [BookingStatus.COMPENSATION]: {
    label: "Tazminat",
    className: "bg-orange-600 text-white",
  },
  [BookingStatus.CANCELLED]: {
    label: "İptal",
    className: "bg-red-100 text-red-700",
  },
};

export const BOOKING_STATUS_OPTIONS = BOOKING_STATUS_ORDER.map((value) => ({
  value,
  label: BOOKING_STATUS_META[value].label,
}));

export const BOOKING_BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.NEW,
  BookingStatus.PREPAYMENT,
  BookingStatus.CONFIRMATION_SENT,
  BookingStatus.CONFIRMED,
];

export function getBookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_META[status].label;
}

export function isBlockingBookingStatus(status: BookingStatus): boolean {
  return BOOKING_BLOCKING_STATUSES.includes(status);
}
