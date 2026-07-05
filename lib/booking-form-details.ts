import type { BookingStatus } from "@prisma/client";
import { calculateNights } from "@/lib/queries/bookings";
import type { StayStatus } from "@/lib/stay-status";

export type BookingGuestEntry = {
  name: string;
  nationalId: string;
  plate: string;
};

export type BookingDetails = {
  grossPrice?: number | null;
  discountRate?: number | null;
  discountAmount?: number | null;
  agencyServiceFee?: number | null;
  prepaymentAmount?: number | null;
  prepaymentRate?: number | null;
  prepaymentBank?: string;
  cleaningFee?: number | null;
  heatingFee?: number | null;
  damageDeposit?: number | null;
  extraServiceFee?: number | null;
  checkInPayment?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  guestTc?: string;
  guestAccountingCode?: string;
  guestAddress?: string;
  wantsTaxpayerInfo?: string;
  taxpayerType?: string;
  eInvoiceUser?: string;
  invoiceTitle?: string;
  invoiceCountry?: string;
  invoiceCity?: string;
  invoiceDistrict?: string;
  invoiceAddress?: string;
  invoiceTaxOffice?: string;
  invoiceTaxNumber?: string;
  invoiceDate?: string;
  invoiceNo?: string;
  invoiceAmount?: number | null;
  issuedInvoiceAmount?: number | null;
  agencyName?: string;
  agencyCommissionRate?: number | null;
  agencyCommissionEarned?: number | null;
  agencyExpectedAmount?: number | null;
  agencyReceivedDate?: string;
  agencyReceivedAmount?: number | null;
  ownerPaymentTerm?: string;
  ownerPayableAmount?: number | null;
  ownerCollectFromGuest?: number | null;
  ownerPaymentDueDate?: string;
  ownerPaymentDate?: string;
  ownerPaidAmount?: number | null;
  salesRepName?: string;
  salesRepCommissionRate?: number | null;
  salesRepCommissionEarned?: number | null;
  agencyNote?: string;
  customerNote?: string;
  importPaymentMethod?: string;
  adultGuests?: BookingGuestEntry[];
  childGuests?: BookingGuestEntry[];
  babyGuests?: BookingGuestEntry[];
};

export { STAY_STATUS_OPTIONS } from "@/lib/stay-status";

export const YES_NO_OPTIONS = [
  { value: "hayir", label: "Hayır" },
  { value: "evet", label: "Evet" },
];

export const TAXPAYER_TYPE_OPTIONS = [
  { value: "sahis", label: "Şahıs" },
  { value: "sirket", label: "Şirket" },
];

export function emptyGuestEntry(): BookingGuestEntry {
  return { name: "", nationalId: "", plate: "" };
}

export function parseBookingDetails(value: unknown): BookingDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as BookingDetails;
}

export function resolveExternalCode(
  externalCode: number | null | undefined,
  guestEmail: string
): string {
  if (externalCode != null) return String(externalCode);
  const match = guestEmail.match(/^import-(\d+)@/);
  return match?.[1] ?? "";
}

export function formatBookingDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeNetPrice(details: BookingDetails): number | null {
  const gross = details.grossPrice;
  if (gross == null) return null;
  const discount = details.discountAmount ?? 0;
  const agencyFee = details.agencyServiceFee ?? 0;
  return Math.max(0, gross - discount + agencyFee);
}

export function computeBalance(
  netPrice: number | null,
  prepayment: number | null | undefined
): number | null {
  if (netPrice == null) return null;
  return Math.max(0, netPrice - (prepayment ?? 0));
}

export function computeCommissionAmount(
  netPrice: number | null,
  rate: number | null | undefined
): number | null {
  if (netPrice == null || rate == null) return null;
  return Math.round((netPrice * rate) / 100);
}

export function buildGuestRows(
  count: number,
  existing: BookingGuestEntry[] = []
): BookingGuestEntry[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    name: existing[index]?.name ?? "",
    nationalId: existing[index]?.nationalId ?? "",
    plate: existing[index]?.plate ?? "",
  }));
}

export function defaultDetailsFromBooking(booking: {
  totalPrice: number | null;
  guestName: string;
  adults: number;
  children: number;
  babies: number;
  details: unknown;
}): BookingDetails {
  const parsed = parseBookingDetails(booking.details);
  const gross = parsed.grossPrice ?? booking.totalPrice ?? null;

  return {
    grossPrice: gross,
    discountRate: parsed.discountRate ?? 0,
    discountAmount: parsed.discountAmount ?? 0,
    agencyServiceFee: parsed.agencyServiceFee ?? 0,
    prepaymentAmount: parsed.prepaymentAmount ?? null,
    prepaymentRate: parsed.prepaymentRate ?? 20,
    prepaymentBank: parsed.prepaymentBank ?? "",
    cleaningFee: parsed.cleaningFee ?? 0,
    heatingFee: parsed.heatingFee ?? 0,
    damageDeposit: parsed.damageDeposit ?? 0,
    extraServiceFee: parsed.extraServiceFee ?? 0,
    checkInPayment: parsed.checkInPayment ?? null,
    commissionRate: parsed.commissionRate ?? 20,
    commissionAmount: parsed.commissionAmount ?? null,
    guestTc: parsed.guestTc ?? "",
    guestAccountingCode: parsed.guestAccountingCode ?? "",
    guestAddress: parsed.guestAddress ?? "",
    wantsTaxpayerInfo: parsed.wantsTaxpayerInfo ?? "hayir",
    taxpayerType: parsed.taxpayerType ?? "sahis",
    eInvoiceUser: parsed.eInvoiceUser ?? "hayir",
    invoiceTitle: parsed.invoiceTitle ?? booking.guestName,
    invoiceCountry: parsed.invoiceCountry ?? "Türkiye",
    invoiceCity: parsed.invoiceCity ?? "",
    invoiceDistrict: parsed.invoiceDistrict ?? "",
    invoiceAddress: parsed.invoiceAddress ?? "",
    invoiceTaxOffice: parsed.invoiceTaxOffice ?? "",
    invoiceTaxNumber: parsed.invoiceTaxNumber ?? "",
    invoiceDate: parsed.invoiceDate ?? "",
    invoiceNo: parsed.invoiceNo ?? "",
    invoiceAmount: parsed.invoiceAmount ?? null,
    issuedInvoiceAmount: parsed.issuedInvoiceAmount ?? null,
    agencyName: parsed.agencyName ?? "Tatil Villacısı",
    agencyCommissionRate: parsed.agencyCommissionRate ?? 0,
    agencyCommissionEarned: parsed.agencyCommissionEarned ?? 0,
    agencyExpectedAmount: parsed.agencyExpectedAmount ?? 0,
    agencyReceivedDate: parsed.agencyReceivedDate ?? "",
    agencyReceivedAmount: parsed.agencyReceivedAmount ?? 0,
    ownerPaymentTerm: parsed.ownerPaymentTerm ?? "",
    ownerPayableAmount: parsed.ownerPayableAmount ?? null,
    ownerCollectFromGuest: parsed.ownerCollectFromGuest ?? null,
    ownerPaymentDueDate: parsed.ownerPaymentDueDate ?? "",
    ownerPaymentDate: parsed.ownerPaymentDate ?? "",
    ownerPaidAmount: parsed.ownerPaidAmount ?? null,
    salesRepName: parsed.salesRepName ?? "",
    salesRepCommissionRate: parsed.salesRepCommissionRate ?? 0,
    salesRepCommissionEarned: parsed.salesRepCommissionEarned ?? 0,
    agencyNote: parsed.agencyNote ?? "",
    customerNote: parsed.customerNote ?? "",
    adultGuests: buildGuestRows(
      booking.adults,
      parsed.adultGuests?.length
        ? parsed.adultGuests
        : [{ name: booking.guestName, nationalId: "", plate: "" }]
    ),
    childGuests: buildGuestRows(booking.children, parsed.childGuests),
    babyGuests: buildGuestRows(booking.babies, parsed.babyGuests),
  };
}

export function getNightCount(checkIn: Date, checkOut: Date): number {
  return calculateNights(checkIn, checkOut);
}

export type BookingDetailRecord = {
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
  stayStatus: StayStatus;
  details: unknown;
  createdAt: Date;
  villa: {
    id: string;
    villaId: number | null;
    name: string;
    originalName: string;
    salesType: string;
    kbsReportable: boolean;
    owner: {
      name: string;
      accountingCode: string;
    } | null;
  };
};
