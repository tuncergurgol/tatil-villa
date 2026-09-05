import { BookingStatus } from "@prisma/client";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import {
  computeSalesRepCommissionEarned,
  normalizeBookingSiteInfo,
  parseBookingDetails,
  resolveBookingCommissionAmount,
  type BookingDetails,
} from "@/lib/booking-form-details";
import { computeOwnerPayableAmount } from "@/lib/owner-payment-schedule";
import { calculateNights } from "@/lib/stay-nights";
import { getStayStatusLabel } from "@/lib/stay-status";
import {
  BOOKING_EXCEL_COLUMN_MAP,
  formatBookingStatusForExcel,
} from "@/lib/booking-excel-import";

export function dateToExcelSerial(date: Date): number {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  return (utc - Date.UTC(1899, 11, 30)) / 86_400_000;
}

function optionalDateToExcelSerial(value: string | null | undefined): number | "" {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const date = new Date(
    trimmed.includes("T") ? trimmed : `${trimmed.slice(0, 10)}T00:00:00.000Z`
  );
  return Number.isNaN(date.getTime()) ? "" : dateToExcelSerial(date);
}

function formatSalesTypeLabel(value: string | null | undefined): string {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "kiralama") return "KİRALAMA";
  return "KOMİSYON";
}

function formatKbsForExcel(value: boolean | null | undefined): string {
  return value ? "EVET" : "HAYIR";
}

function formatGuestEmailForExcel(email: string): string {
  if (isImportedPlaceholderEmail(email)) return "";
  return email.trim();
}

export function resolveBookingGuestIdentity(input: {
  guestPhone: string;
  guestEmail: string;
  details: BookingDetails;
}) {
  const primary = input.details.adultGuests?.[0];
  return {
    phone: input.guestPhone.trim(),
    email: formatGuestEmailForExcel(input.guestEmail),
    nationality:
      primary?.nationality?.trim() ||
      input.details.guestCountry?.trim() ||
      "TC",
    nationalId:
      primary?.nationalId?.trim() || input.details.guestTc?.trim() || "",
    birthDate: "",
  };
}

export function formatBookingSiteNameForExcel(
  siteInfo: string | null | undefined
): string {
  return normalizeBookingSiteInfo(siteInfo);
}

export function buildBookingExcelRowValues(input: {
  externalCode: number | null;
  createdAt: Date;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  facilityName: string;
  totalPrice: number | null;
  status: BookingStatus;
  stayStatus: string;
  details: ReturnType<typeof parseBookingDetails>;
  ownerAccountingCode?: string | null;
  ownerName?: string | null;
  salesType?: string | null;
  kbsReportable?: boolean | null;
}): unknown[] {
  const details = input.details;
  const guestCount = Math.max(input.adults + input.children, 1);
  const nights = calculateNights(input.checkIn, input.checkOut);
  const grossPrice = details.grossPrice ?? null;
  const discountAmount = details.discountAmount ?? null;
  const prepaymentAmount = details.prepaymentAmount ?? null;
  const balanceAmount = details.checkInPayment ?? null;
  const cleaningFee = details.cleaningFee ?? null;
  const commissionAmount = resolveBookingCommissionAmount(
    details,
    input.totalPrice
  );
  const ownerPayableAmount =
    details.ownerPayableAmount ??
    computeOwnerPayableAmount(prepaymentAmount, commissionAmount);
  const ownerCollectFromGuest =
    details.ownerCollectFromGuest ??
    Math.max(0, (balanceAmount ?? 0) + (cleaningFee ?? 0));
  const invoiceAmount = details.invoiceAmount ?? null;
  const issuedInvoiceAmount =
    details.issuedInvoiceAmount ?? invoiceAmount ?? null;
  const salesRepCommissionEarned =
    details.salesRepCommissionEarned ??
    computeSalesRepCommissionEarned(
      input.totalPrice,
      details.salesRepCommissionRate
    ) ??
    0;
  const commissionInvoiceDifference = commissionAmount - (invoiceAmount ?? 0);
  const guestIdentity = resolveBookingGuestIdentity({
    guestPhone: input.guestPhone ?? "",
    guestEmail: input.guestEmail ?? "",
    details,
  });

  return [
    input.externalCode ?? "",
    formatBookingSiteNameForExcel(input.details.siteInfo),
    dateToExcelSerial(input.createdAt),
    input.guestName,
    dateToExcelSerial(input.checkIn),
    dateToExcelSerial(input.checkOut),
    nights,
    guestCount,
    input.facilityName,
    grossPrice ?? "",
    discountAmount ?? "",
    input.totalPrice ?? "",
    prepaymentAmount ?? "",
    balanceAmount ?? "",
    cleaningFee ?? "",
    details.heatingFee ?? "",
    invoiceAmount ?? "",
    details.importPaymentMethod || details.paymentMethod || "",
    details.agencyName || "Tatil Villacısı",
    details.salesRepName || "",
    formatBookingStatusForExcel(input.status),
    getStayStatusLabel(
      input.stayStatus as Parameters<typeof getStayStatusLabel>[0]
    ),
    details.importOwnerAccountingCode || input.ownerAccountingCode || "",
    details.importOwnerName || input.ownerName || "",
    details.importWelcomeMode || "KENDİSİ",
    details.importWorkMode || formatSalesTypeLabel(input.salesType),
    details.commissionRate ?? "",
    commissionAmount || "",
    ownerPayableAmount || "",
    ownerCollectFromGuest || "",
    optionalDateToExcelSerial(details.ownerPaymentDueDate),
    optionalDateToExcelSerial(details.ownerPaymentDate),
    details.ownerPaidAmount ?? "",
    details.agencyCommissionRate ?? "",
    details.agencyCommissionEarned ?? "",
    details.agencyExpectedAmount ?? "",
    details.importAgencyAccountingCode || "320.00.000",
    optionalDateToExcelSerial(details.agencyReceivedDate),
    details.agencyReceivedAmount ?? "",
    optionalDateToExcelSerial(details.invoiceDate),
    details.invoiceNo || "",
    details.invoiceTitle || input.guestName,
    issuedInvoiceAmount ?? "",
    salesRepCommissionEarned,
    details.invoiceDifference ?? "",
    details.invoiceAmountDifference ?? "",
    formatKbsForExcel(input.kbsReportable),
    commissionInvoiceDifference,
    guestIdentity.phone,
    guestIdentity.email,
    guestIdentity.nationality,
    guestIdentity.nationalId,
    guestIdentity.birthDate,
  ];
}

export const BOOKING_EXCEL_COLUMN_COUNT = BOOKING_EXCEL_COLUMN_MAP.length;
