import type { BookingStatus } from "@prisma/client";
import {
  mapPublicPaymentMethodToCompanyType,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
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
  ownerDiscountRate?: number | null;
  ownerDiscountAmount?: number | null;
  agencyDiscountRate?: number | null;
  agencyDiscountAmount?: number | null;
  agencyServiceFee?: number | null;
  prepaymentAmount?: number | null;
  prepaymentRate?: number | null;
  prepaymentBank?: string;
  cleaningFee?: number | null;
  extraAccommodationFee?: number | null;
  petCleaningFee?: number | null;
  poolHeatingPrivateFee?: number | null;
  poolHeatingIndoorFee?: number | null;
  poolHeatingKidsFee?: number | null;
  underfloorHeatingFee?: number | null;
  heatingFee?: number | null;
  damageDeposit?: number | null;
  petDamageDeposit?: number | null;
  extraServiceFee?: number | null;
  checkInPayment?: number | null;
  /** Public talep ekranından gelen kalemler admin’de period birim ücretiyle ezilmesin */
  feesFromQuote?: boolean;
  source?: string;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  guestTc?: string;
  guestAccountingCode?: string;
  guestAddress?: string;
  guestDistrict?: string;
  guestCity?: string;
  guestCountry?: string;
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
  siteInfo?: string;
  importPaymentMethod?: string;
  /** Public talep: card | transfer */
  paymentMethod?: string;
  paymentAmount?: string;
  adultGuests?: BookingGuestEntry[];
  childGuests?: BookingGuestEntry[];
  babyGuests?: BookingGuestEntry[];
  /** Konfirme gönderim geçmişi (Sistem WhatsApp / e-posta / SMS) */
  confirmationSends?: BookingConfirmationSendRecord[];
};

export type BookingConfirmationSendChannel = "whatsapp" | "email" | "sms";

export type BookingConfirmationSendRecord = {
  id: string;
  sentAt: string;
  channels: BookingConfirmationSendChannel[];
  status: "sent" | "failed";
  error?: string;
};

export { STAY_STATUS_OPTIONS } from "@/lib/stay-status";

/** Tek site — alt acente yapısı kapalı */
export const DEFAULT_BOOKING_SITE_INFO = "Tatildeyiz";
export const DEFAULT_BOOKING_AGENCY_NAME = "TATİLDEYİZ";

/** Site adı listesini Türkçe büyük/küçük harf duyarsız tekilleştirir. */
export function dedupeSiteInfoNames(names: string[]): string[] {
  const byKey = new Map<string, string>();

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("tr");
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, name);
      continue;
    }
    // Tercih: kanonik varsayılan ("Tatildeyiz")
    if (
      name.localeCompare(DEFAULT_BOOKING_SITE_INFO, "tr", {
        sensitivity: "base",
      }) === 0 &&
      name === DEFAULT_BOOKING_SITE_INFO
    ) {
      byKey.set(key, name);
      continue;
    }
    // Aksi halde TÜMÜ BÜYÜK olanı karışık yazıma tercih etme
    const existingAllCaps =
      existing === existing.toLocaleUpperCase("tr") &&
      existing !== existing.toLocaleLowerCase("tr");
    const nextAllCaps =
      name === name.toLocaleUpperCase("tr") &&
      name !== name.toLocaleLowerCase("tr");
    if (existingAllCaps && !nextAllCaps) {
      byKey.set(key, name);
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.localeCompare(b, "tr", { sensitivity: "base" })
  );
}

export function normalizeBookingSiteInfo(
  value: string | null | undefined
): string {
  const trimmed = value?.trim() || "";
  if (!trimmed) return DEFAULT_BOOKING_SITE_INFO;
  if (
    trimmed.localeCompare(DEFAULT_BOOKING_SITE_INFO, "tr", {
      sensitivity: "base",
    }) === 0
  ) {
    return DEFAULT_BOOKING_SITE_INFO;
  }
  return trimmed;
}

export const YES_NO_OPTIONS = [
  { value: "hayir", label: "Hayır" },
  { value: "evet", label: "Evet" },
];

export const TAXPAYER_TYPE_OPTIONS = [
  { value: "sahis", label: "Şahıs" },
  { value: "sirket", label: "Şirket" },
];

export const BOOKING_EXTRA_FEE_FIELDS = [
  { key: "extraAccommodationFee", label: "Ek Konaklama Bedeli" },
  { key: "cleaningFee", label: "Temizlik Bedeli" },
  { key: "petCleaningFee", label: "Evcil Hayvan Temizlik Bedeli" },
  { key: "poolHeatingPrivateFee", label: "Havuz Isıtma (Özel Havuz)" },
  { key: "poolHeatingIndoorFee", label: "Havuz Isıtma (Kapalı (İç) Havuz)" },
  { key: "poolHeatingKidsFee", label: "Havuz Isıtma (Çocuk Havuzu)" },
  { key: "underfloorHeatingFee", label: "Yerden Isıtma" },
] as const;

export type BookingExtraFeeFieldKey =
  (typeof BOOKING_EXTRA_FEE_FIELDS)[number]["key"];

export function formatFeeInputValue(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return String(value);
}

export function emptyGuestEntry(): BookingGuestEntry {
  return { name: "", nationalId: "", plate: "" };
}

export function parseBookingDetails(value: unknown): BookingDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const parsed = value as BookingDetails;
  return {
    ...parsed,
    confirmationSends: normalizeConfirmationSends(parsed.confirmationSends),
  };
}

const CONFIRMATION_SEND_CHANNELS = new Set<BookingConfirmationSendChannel>([
  "whatsapp",
  "email",
  "sms",
]);

export function normalizeConfirmationSends(
  value: unknown
): BookingConfirmationSendRecord[] {
  if (!Array.isArray(value)) return [];

  const items: BookingConfirmationSendRecord[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    const sentAt = typeof item.sentAt === "string" ? item.sentAt : "";
    if (!id || !sentAt) continue;

    const channels = Array.isArray(item.channels)
      ? item.channels.filter(
          (channel): channel is BookingConfirmationSendChannel =>
            typeof channel === "string" &&
            CONFIRMATION_SEND_CHANNELS.has(
              channel as BookingConfirmationSendChannel
            )
        )
      : [];

    items.push({
      id,
      sentAt,
      channels,
      status: item.status === "failed" ? "failed" : "sent",
      ...(typeof item.error === "string" && item.error
        ? { error: item.error }
        : {}),
    });
  }

  return items;
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

export function clampDiscountRate(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function computeDiscountAmount(
  basePrice: number | null | undefined,
  rate: number | null | undefined
): number {
  if (basePrice == null || !Number.isFinite(basePrice)) return 0;
  const clampedRate = clampDiscountRate(rate);
  return Math.round((basePrice * clampedRate) / 100);
}

export function hasBookingDiscountAmounts(
  ownerDiscountAmount: number | null | undefined,
  agencyDiscountAmount: number | null | undefined
): boolean {
  return (ownerDiscountAmount ?? 0) > 0 || (agencyDiscountAmount ?? 0) > 0;
}

/**
 * Ön ödeme:
 * - Villa sahibi + acente indirim tutarları 0 ise talep tutarı korunur
 * - İndirim varsa: (((konaklama - villa sahibi indirim) * oran) - acente indirim)
 */
export function computePrepaymentAmount(
  grossPrice: number | null | undefined,
  ownerDiscountAmount: number | null | undefined,
  prepaymentRate: number | null | undefined,
  agencyDiscountAmount: number | null | undefined,
  talepPrepaymentAmount?: number | null
): number | null {
  const hasDiscount = hasBookingDiscountAmounts(
    ownerDiscountAmount,
    agencyDiscountAmount
  );

  if (
    !hasDiscount &&
    talepPrepaymentAmount != null &&
    Number.isFinite(talepPrepaymentAmount)
  ) {
    return Math.max(0, Math.round(talepPrepaymentAmount));
  }

  if (grossPrice == null || !Number.isFinite(grossPrice)) return null;

  const ownerDiscount = ownerDiscountAmount ?? 0;
  const agencyDiscount = agencyDiscountAmount ?? 0;
  const rate = clampDiscountRate(prepaymentRate);
  const baseAfterOwnerDiscount = Math.max(0, grossPrice - ownerDiscount);
  const prepaymentBase = Math.round((baseAfterOwnerDiscount * rate) / 100);

  return Math.max(0, prepaymentBase - agencyDiscount);
}

export function computeNetPrice(details: BookingDetails): number | null {
  const gross = details.grossPrice;
  if (gross == null) return null;
  const ownerDiscount =
    details.ownerDiscountAmount ?? details.discountAmount ?? 0;
  const agencyDiscount = details.agencyDiscountAmount ?? 0;
  const agencyFee = details.agencyServiceFee ?? 0;
  return Math.max(0, gross - ownerDiscount - agencyDiscount + agencyFee);
}

export function computeBalance(
  netPrice: number | null,
  prepayment: number | null | undefined
): number | null {
  if (netPrice == null) return null;
  return Math.max(0, netPrice - (prepayment ?? 0));
}

export function sumExtraFees(details: BookingDetails): number {
  return BOOKING_EXTRA_FEE_FIELDS.reduce(
    (sum, { key }) => sum + (details[key] ?? 0),
    0
  );
}

export function computeReservationTotal(
  details: BookingDetails
): number | null {
  const accommodation = details.grossPrice;
  if (accommodation == null) return null;
  return accommodation + sumExtraFees(details);
}

export function computeEntrancePayment(
  reservationTotal: number | null,
  prepayment: number | null | undefined
): number | null {
  if (reservationTotal == null) return null;
  return Math.max(0, reservationTotal - (prepayment ?? 0));
}

export function computeCheckInPayment(
  balance: number | null,
  details: BookingDetails
): number | null {
  if (balance == null) return null;
  return balance + sumExtraFees(details);
}

/**
 * Komisyon tutarı:
 * (((konaklama - villa sahibi indirim) * komisyon oranı) - acente indirim)
 */
export function computeCommissionAmount(
  grossPrice: number | null | undefined,
  ownerDiscountAmount: number | null | undefined,
  commissionRate: number | null | undefined,
  agencyDiscountAmount: number | null | undefined
): number | null {
  if (
    grossPrice == null ||
    !Number.isFinite(grossPrice) ||
    commissionRate == null ||
    !Number.isFinite(commissionRate)
  ) {
    return null;
  }

  const ownerDiscount = ownerDiscountAmount ?? 0;
  const agencyDiscount = agencyDiscountAmount ?? 0;
  const rate = clampDiscountRate(commissionRate);
  const baseAfterOwnerDiscount = Math.max(0, grossPrice - ownerDiscount);
  const commissionBase = Math.round((baseAfterOwnerDiscount * rate) / 100);

  return Math.max(0, commissionBase - agencyDiscount);
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
  const fromQuoteFees = parsed.feesFromQuote === true;
  // grossPrice yoksa: talep kalemleri kaydedilmişse totalPrice’ı konaklama sanma.
  // Eski public kayıtlarda grossPrice yok → totalPrice fallback (yanlış olabilir).
  const gross = fromQuoteFees
    ? (parsed.grossPrice ?? null)
    : (parsed.grossPrice ?? booking.totalPrice ?? null);

  const paymentFromRequest =
    normalizeCompanyPaymentType(
      parsed.importPaymentMethod ?? parsed.prepaymentBank ?? ""
    ) || mapPublicPaymentMethodToCompanyType(parsed.paymentMethod);

  return {
    grossPrice: gross,
    discountRate: parsed.discountRate ?? parsed.ownerDiscountRate ?? 0,
    discountAmount: parsed.discountAmount ?? parsed.ownerDiscountAmount ?? 0,
    ownerDiscountRate:
      parsed.ownerDiscountRate ?? parsed.discountRate ?? 0,
    ownerDiscountAmount:
      parsed.ownerDiscountAmount ?? parsed.discountAmount ?? 0,
    agencyDiscountRate: parsed.agencyDiscountRate ?? 0,
    agencyDiscountAmount: parsed.agencyDiscountAmount ?? 0,
    agencyServiceFee: parsed.agencyServiceFee ?? 0,
    prepaymentAmount: parsed.prepaymentAmount ?? null,
    prepaymentRate: parsed.prepaymentRate ?? 20,
    prepaymentBank: paymentFromRequest,
    importPaymentMethod: paymentFromRequest,
    paymentMethod: parsed.paymentMethod,
    paymentAmount: parsed.paymentAmount,
    cleaningFee: parsed.cleaningFee ?? null,
    extraAccommodationFee:
      parsed.extraAccommodationFee ?? parsed.extraServiceFee ?? null,
    petCleaningFee: parsed.petCleaningFee ?? null,
    poolHeatingPrivateFee: parsed.poolHeatingPrivateFee ?? null,
    poolHeatingIndoorFee: parsed.poolHeatingIndoorFee ?? null,
    poolHeatingKidsFee: parsed.poolHeatingKidsFee ?? null,
    underfloorHeatingFee:
      parsed.underfloorHeatingFee ?? parsed.heatingFee ?? null,
    heatingFee: parsed.heatingFee ?? null,
    damageDeposit: parsed.damageDeposit ?? null,
    petDamageDeposit: parsed.petDamageDeposit ?? null,
    extraServiceFee: parsed.extraServiceFee ?? null,
    checkInPayment: parsed.checkInPayment ?? null,
    feesFromQuote: parsed.feesFromQuote ?? false,
    source: parsed.source,
    commissionRate: parsed.commissionRate ?? 20,
    commissionAmount: parsed.commissionAmount ?? null,
    guestTc: parsed.guestTc ?? "",
    guestAccountingCode: parsed.guestAccountingCode ?? "",
    guestAddress: parsed.guestAddress ?? "",
    guestDistrict: parsed.guestDistrict ?? "",
    guestCity: parsed.guestCity ?? "",
    guestCountry: parsed.guestCountry ?? "Türkiye",
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
    agencyName: parsed.agencyName ?? DEFAULT_BOOKING_AGENCY_NAME,
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
    siteInfo: normalizeBookingSiteInfo(parsed.siteInfo),
    confirmationSends: normalizeConfirmationSends(parsed.confirmationSends),
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

export type BookingPrepaymentRecord = {
  id: string;
  paymentChannel: string;
  bankAccountId: string | null;
  amount: number;
  createdAt: Date;
  bankAccount: {
    id: string;
    bankName: string;
    accountHolder: string;
    iban: string;
  } | null;
};

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
  optionExpiresAt: Date | null;
  confirmationSentAt: Date | null;
  details: unknown;
  createdAt: Date;
  prepayments: BookingPrepaymentRecord[];
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
