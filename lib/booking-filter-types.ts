import type { BookingStatus } from "@prisma/client";

export type BookingQuickFilter =
  | "check_in_today"
  | "check_in_1_day"
  | "check_in_2_days"
  | "check_in_yesterday"
  | "check_out_today"
  | "check_out_1_day"
  | "check_out_2_days";

export type BookingFilters = {
  status: BookingStatus | null;
  quickFilter: BookingQuickFilter | null;
  customerName: string;
  email: string;
  phone: string;
  villaSearch: string;
  selectedVillaIds: string[];
  reservationNo: string;
  reservationDateStart: string;
  reservationDateEnd: string;
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
  paymentDateStart: string;
  paymentDateEnd: string;
};

export const BOOKING_QUICK_FILTER_OPTIONS: {
  value: BookingQuickFilter;
  label: string;
}[] = [
  { value: "check_in_today", label: "Bugün Girişli Rezervasyonlar" },
  { value: "check_in_1_day", label: "Tatile 1 gün kalanlar" },
  { value: "check_in_2_days", label: "Tatile 2 gün kalanlar" },
  {
    value: "check_in_yesterday",
    label: "Giriş gününden 1 gün sonra",
  },
  { value: "check_out_today", label: "Bugün çıkanlar" },
  { value: "check_out_1_day", label: "Çıkışa 1 gün kalanlar" },
  { value: "check_out_2_days", label: "Çıkışa 2 gün kalanlar" },
];

export const emptyBookingFilters = (): BookingFilters => ({
  status: null,
  quickFilter: null,
  customerName: "",
  email: "",
  phone: "",
  villaSearch: "",
  selectedVillaIds: [],
  reservationNo: "",
  reservationDateStart: "",
  reservationDateEnd: "",
  checkInStart: "",
  checkInEnd: "",
  checkOutStart: "",
  checkOutEnd: "",
  paymentDateStart: "",
  paymentDateEnd: "",
});
