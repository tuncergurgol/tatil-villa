import type { BookingStatus, LoyaltyTier } from "@prisma/client";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log-core";
import { normalizeActivityLogs } from "@/lib/booking-activity-log-core";
import {
  mapPublicPaymentMethodToCompanyType,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import { calculateNights } from "@/lib/stay-nights";
import type { StayStatus } from "@/lib/stay-status";

export type BookingGuestEntry = {
  name: string;
  /** Soyad (public onay formu); admin tabloda name ile birleşik de tutulabilir */
  surname?: string;
  nationalId: string;
  plate: string;
  gender?: "male" | "female" | "";
  nationality?: string;
};

export type BookingDetails = {
  grossPrice?: number | null;
  discountRate?: number | null;
  discountAmount?: number | null;
  ownerDiscountRate?: number | null;
  ownerDiscountAmount?: number | null;
  agencyDiscountRate?: number | null;
  agencyDiscountAmount?: number | null;
  /** Kupon / kampanya (varsa; DEĞİŞİKLİK YAP ile temizlenir) */
  couponCode?: string | null;
  couponDiscountRate?: number | null;
  couponDiscountAmount?: number | null;
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
  importSource?: string;
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
  /** Villa sahibine yapılan ödemeler (Ödemeler sekmesi) */
  ownerPayments?: BookingOwnerPaymentRecord[];
  /** Misafire yapılan iade ödemeleri (Ödemeler sekmesi) */
  guestRefundPayments?: BookingOwnerPaymentRecord[];
  salesRepName?: string;
  salesRepUserId?: string;
  salesRepCommissionRate?: number | null;
  salesRepCommissionEarned?: number | null;
  agencyNote?: string;
  customerNote?: string;
  siteInfo?: string;
  /** Talebin geldiği host/domain (www.balayivillacisi.com vb.) */
  originDomain?: string;
  importPaymentMethod?: string;
  importOwnerAccountingCode?: string;
  importOwnerName?: string;
  importWelcomeMode?: string;
  importWorkMode?: string;
  importAgencyAccountingCode?: string;
  invoiceDifference?: number | null;
  invoiceAmountDifference?: number | null;
  /** Tazminat tutarı (komisyon = bu tutar) */
  compensationAmount?: number | null;
  /** Tazminatta misafire iade edilen tutar */
  guestRefundAmount?: number | null;
  /** Misafir iade ödeme tarihi (yyyy-mm-dd) — Tazminatı Uygula günü */
  guestRefundPaymentDate?: string | null;
  /** İptal nedeni kodu (customer_withdraw, customer_force_majeure, …) */
  cancellationReason?: string | null;
  /** İptal sırasında tazminat uygulandı mı */
  cancellationHasCompensation?: boolean | null;
  /** İptal sırasında mücbir sebep iadesi uygulandı mı */
  cancellationHasForceMajeure?: boolean | null;
  /** Mücbir sebep iade tutarı */
  forceMajeureRefundAmount?: number | null;
  /** Mücbir sebep iade alıcısı: guest | owner */
  forceMajeureRefundRecipient?: "guest" | "owner" | null;
  /** İptal kaydı zamanı (ISO) */
  cancelledAt?: string | null;
  /** Public talep: üye sadakat sınıfı (mail şablonu) */
  memberLoyaltyTier?: LoyaltyTier | null;
  /** Public talep: card | transfer */
  paymentMethod?: string;
  paymentAmount?: string;
  /** Excel takip dosyasına yazıldığı zaman */
  excelExportedAt?: string | null;
  excelExportRow?: number | null;
  excelExportNote?: string | null;
  adultGuests?: BookingGuestEntry[];
  childGuests?: BookingGuestEntry[];
  babyGuests?: BookingGuestEntry[];
  /** Konfirme gönderim geçmişi (Bildirim WhatsApp / e-posta / SMS) */
  confirmationSends?: BookingConfirmationSendRecord[];
  /** Rezervasyon işlem logları (oluşturma → fatura) */
  activityLogs?: BookingActivityLogEntry[];
};

export type BookingConfirmationSendChannel = "whatsapp" | "email" | "sms";

export type BookingConfirmationSendRecord = {
  id: string;
  sentAt: string;
  channels: BookingConfirmationSendChannel[];
  status: "sent" | "failed";
  error?: string;
};

export type BookingOwnerPaymentRecord = {
  id: string;
  /** Ödeme yapılan tarih (yyyy-mm-dd) */
  paidAt: string;
  amount: number;
  createdAt: string;
};

export function normalizeOwnerPayments(
  value: unknown
): BookingOwnerPaymentRecord[] {
  if (!Array.isArray(value)) return [];
  const rows: BookingOwnerPaymentRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const paidAt = typeof row.paidAt === "string" ? row.paidAt.trim() : "";
    const amount = Number(row.amount);
    if (!id || !paidAt || !Number.isFinite(amount) || amount <= 0) continue;
    const createdAt =
      typeof row.createdAt === "string" && row.createdAt.trim()
        ? row.createdAt
        : new Date().toISOString();
    rows.push({
      id,
      paidAt,
      amount: Math.round(amount),
      createdAt,
    });
  }
  return rows.sort((a, b) => a.paidAt.localeCompare(b.paidAt));
}

/** Misafir iade ödeme kayıtları — villa sahibi ödemeleriyle aynı şekil. */
export const normalizeGuestRefundPayments = normalizeOwnerPayments;

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
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return "";
  return rounded.toLocaleString("tr-TR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function emptyGuestEntry(): BookingGuestEntry {
  return {
    name: "",
    surname: "",
    nationalId: "",
    plate: "",
    gender: "",
    nationality: "TC",
  };
}

/**
 * Ad + soyadı birleştirir; `name` zaten soyadı içeriyorsa (admin tek alan / onay formu)
 * tekrar eklemez. Örn. name="Nejla Gürgöl" + surname="Gürgöl" → "Nejla Gürgöl".
 */
export function formatGuestFullName(guest: {
  name?: string | null;
  surname?: string | null;
}): string {
  const name = (guest.name ?? "").trim();
  const surname = (guest.surname ?? "").trim();
  if (!name) return surname;
  if (!surname) return name;

  const nameLower = name.toLocaleLowerCase("tr-TR");
  const surnameLower = surname.toLocaleLowerCase("tr-TR");
  if (
    nameLower === surnameLower ||
    nameLower.endsWith(` ${surnameLower}`)
  ) {
    return name;
  }
  return `${name} ${surname}`;
}

export function parseBookingDetails(value: unknown): BookingDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const parsed = value as BookingDetails;
  return {
    ...parsed,
    confirmationSends: normalizeConfirmationSends(parsed.confirmationSends),
    ownerPayments: normalizeOwnerPayments(parsed.ownerPayments),
    guestRefundPayments: normalizeGuestRefundPayments(
      parsed.guestRefundPayments
    ),
    activityLogs: normalizeActivityLogs(parsed.activityLogs),
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

/** DEĞİŞİKLİK YAP: indirim + kupon alanlarını sıfırlar */
export function clearBookingDiscountAndCouponFields(
  details: BookingDetails
): BookingDetails {
  return {
    ...details,
    ownerDiscountRate: 0,
    ownerDiscountAmount: 0,
    discountRate: 0,
    discountAmount: 0,
    agencyDiscountRate: 0,
    agencyDiscountAmount: 0,
    couponCode: "",
    couponDiscountRate: 0,
    couponDiscountAmount: 0,
  };
}

/**
 * Wizard/quote pipeline sonucunu admin form details'e yazar.
 * İndirim/kupon temizliği çağıran tarafta yapılır.
 * Seçmeli ücretler için `fees` alanını çağıran taraf (buildStayBookingFeeDetails) hazırlar.
 */
export function applyStayQuoteToBookingDetails(
  details: BookingDetails,
  quoteResult: {
    quote: {
      valid: boolean;
      accommodationTotal: number;
      cleaningFee: number;
      prepaymentRate: number;
    };
    fees: Record<BookingExtraFeeFieldKey, number | null>;
    damageDeposit: number | null;
  },
  options?: { pets?: number; petDamageDeposit?: number | null }
): BookingDetails {
  if (!quoteResult.quote.valid) {
    return details;
  }

  const pets = options?.pets ?? 0;
  const fees = quoteResult.fees;

  return {
    ...details,
    grossPrice: quoteResult.quote.accommodationTotal,
    cleaningFee: quoteResult.quote.cleaningFee || fees.cleaningFee || null,
    extraAccommodationFee: fees.extraAccommodationFee ?? null,
    petCleaningFee: pets > 0 ? fees.petCleaningFee ?? null : null,
    poolHeatingPrivateFee: fees.poolHeatingPrivateFee ?? null,
    poolHeatingIndoorFee: fees.poolHeatingIndoorFee ?? null,
    poolHeatingKidsFee: fees.poolHeatingKidsFee ?? null,
    underfloorHeatingFee: fees.underfloorHeatingFee ?? null,
    damageDeposit: quoteResult.damageDeposit ?? details.damageDeposit ?? null,
    petDamageDeposit:
      pets > 0
        ? (options?.petDamageDeposit ?? details.petDamageDeposit ?? null)
        : null,
    prepaymentRate: quoteResult.quote.prepaymentRate,
    feesFromQuote: true,
  };
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

/** Belge / özet için: tutarı 0'dan büyük ekstra hizmet kalemleri */
export function listPositiveExtraFees(
  details: BookingDetails
): Array<{ key: BookingExtraFeeFieldKey; label: string; amount: number }> {
  const rows: Array<{
    key: BookingExtraFeeFieldKey;
    label: string;
    amount: number;
  }> = [];
  for (const { key, label } of BOOKING_EXTRA_FEE_FIELDS) {
    const amount = details[key] ?? 0;
    if (amount > 0 && Number.isFinite(amount)) {
      rows.push({ key, label, amount });
    }
  }
  return rows;
}

export function computeReservationTotal(
  details: BookingDetails
): number | null {
  const accommodation = details.grossPrice;
  if (accommodation == null) return null;
  return accommodation + sumExtraFees(details);
}

/** Misafirin ödeyeceği rezervasyon tutarı: indirimli konaklama + ekstra bedeller. */
export function computePayableReservationTotal(
  details: BookingDetails
): number | null {
  const net = computeNetPrice(details);
  if (net == null) return null;
  return net + sumExtraFees(details);
}

/**
 * Rezervasyon toplamı (Fiyat sekmesi):
 * Konaklama Bakiyesi + Ön Ödeme Tutarı + ekstra bedeller
 * (bakiye + ön ödeme ≈ indirimli konaklama; fazla ön ödemede ön ödeme tutarı korunur)
 * “Girişte ödeme = Rezervasyon tutarı − ön ödeme” için kullanılır.
 */
export function computeGuestReservationTotal(
  details: BookingDetails
): number | null {
  const net = computeNetPrice(details);
  if (net == null) return null;
  const balance = computeBalance(net, details.prepaymentAmount);
  if (balance == null) return null;
  const prepayment = details.prepaymentAmount ?? 0;
  return balance + prepayment + sumExtraFees(details);
}

export function computeEntrancePayment(
  reservationTotal: number | null,
  prepayment: number | null | undefined
): number | null {
  if (reservationTotal == null) return null;
  return Math.max(0, reservationTotal - (prepayment ?? 0));
}

/** Girişte alınacak ödeme: Rezervasyon tutarı − yapılan ön ödeme */
export function computeCheckInPayment(
  details: BookingDetails
): number | null {
  return computeEntrancePayment(
    computeGuestReservationTotal(details),
    details.prepaymentAmount
  );
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

/**
 * Rezervasyon formuyla aynı kuralla komisyon tutarını çözer.
 * Kayıtlı tutar yoksa: grossPrice (yoksa totalPrice) × (oran yoksa %20).
 */
export function resolveBookingCommissionAmount(
  details: BookingDetails,
  totalPrice?: number | null
): number {
  if (details.commissionAmount != null && details.commissionAmount > 0) {
    return Math.round(details.commissionAmount);
  }

  const fromQuoteFees = details.feesFromQuote === true;
  const gross = fromQuoteFees
    ? (details.grossPrice ?? null)
    : (details.grossPrice ?? totalPrice ?? null);
  const rate = details.commissionRate ?? 20;

  const computed = computeCommissionAmount(
    gross,
    details.ownerDiscountAmount ?? details.discountAmount,
    rate,
    details.agencyDiscountAmount
  );

  return computed != null && computed > 0 ? Math.round(computed) : 0;
}

/**
 * Satış temsilcisi prim hakedişi:
 * İndirimli konaklama tutarı × prim oranı (%)
 */
export function computeSalesRepCommissionEarned(
  accommodationWithoutCommission: number | null | undefined,
  salesRepCommissionRate: number | null | undefined
): number | null {
  if (
    accommodationWithoutCommission == null ||
    !Number.isFinite(accommodationWithoutCommission) ||
    salesRepCommissionRate == null ||
    !Number.isFinite(salesRepCommissionRate)
  ) {
    return null;
  }
  const rate = clampDiscountRate(salesRepCommissionRate);
  return Math.max(
    0,
    Math.round((accommodationWithoutCommission * rate) / 100)
  );
}

export function buildGuestRows(
  count: number,
  existing: BookingGuestEntry[] = []
): BookingGuestEntry[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => {
    const row = existing[index];
    return {
      name: row?.name ?? "",
      surname: row?.surname ?? "",
      nationalId: row?.nationalId ?? "",
      plate: row?.plate ?? "",
      gender: row?.gender ?? "",
      nationality: row?.nationality ?? "TC",
    };
  });
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
    compensationAmount: parsed.compensationAmount ?? null,
    guestRefundAmount: parsed.guestRefundAmount ?? null,
    guestRefundPaymentDate: parsed.guestRefundPaymentDate ?? null,
    cancellationReason: parsed.cancellationReason ?? null,
    cancellationHasCompensation: parsed.cancellationHasCompensation ?? null,
    cancellationHasForceMajeure: parsed.cancellationHasForceMajeure ?? null,
    forceMajeureRefundAmount: parsed.forceMajeureRefundAmount ?? null,
    forceMajeureRefundRecipient: parsed.forceMajeureRefundRecipient ?? null,
    cancelledAt: parsed.cancelledAt ?? null,
    ownerCollectFromGuest: parsed.ownerCollectFromGuest ?? null,
    ownerPaymentDueDate: parsed.ownerPaymentDueDate ?? "",
    ownerPaymentDate: parsed.ownerPaymentDate ?? "",
    ownerPaidAmount: parsed.ownerPaidAmount ?? null,
    ownerPayments: normalizeOwnerPayments(parsed.ownerPayments),
    guestRefundPayments: normalizeGuestRefundPayments(
      parsed.guestRefundPayments
    ),
    salesRepName: parsed.salesRepName ?? "",
    salesRepUserId: parsed.salesRepUserId ?? "",
    salesRepCommissionRate: parsed.salesRepCommissionRate ?? 0,
    salesRepCommissionEarned: parsed.salesRepCommissionEarned ?? 0,
    agencyNote: parsed.agencyNote ?? "",
    customerNote: parsed.customerNote ?? "",
    siteInfo: normalizeBookingSiteInfo(parsed.siteInfo),
    originDomain: parsed.originDomain?.trim() || "",
    confirmationSends: normalizeConfirmationSends(parsed.confirmationSends),
    activityLogs: normalizeActivityLogs(parsed.activityLogs),
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
    prepaymentPaymentType: {
      id: string;
      name: string;
    } | null;
    owner: {
      name: string;
      accountingCode: string;
    } | null;
  };
};
