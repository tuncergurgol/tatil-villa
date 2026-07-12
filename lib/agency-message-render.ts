import {
  AGENCY_MESSAGE_TEMPLATE_ROW_1_6,
  AGENCY_MESSAGE_TEMPLATE_ROW_1_7,
} from "@/lib/agency-message-row-no";
import {
  computeReservationTotal,
  type BookingDetails,
} from "@/lib/booking-form-details";
import { formatPrepaymentOptionLabel } from "@/lib/booking-prepayment-share";
import {
  getCompanyPaymentTypeLabel,
  normalizeCompanyPaymentType,
  type CompanyPaymentTypeValue,
} from "@/lib/company-payment-types";
import { calculateNights } from "@/lib/queries/bookings";

export function formatAgencyBookingDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString("tr-TR", { month: "long" });
  const monthLabel = month.charAt(0).toLocaleUpperCase("tr-TR") + month.slice(1);
  return `${day}.${monthLabel}.${date.getFullYear()}`;
}

export function formatAgencyMoney(amount: number): string {
  return amount.toLocaleString("tr-TR");
}

export function renderAgencyMessageTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/##([^#]+)##/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    if (key in values) return values[key];
    const upper = key.toLocaleUpperCase("tr-TR");
    if (upper in values) return values[upper];
    return match;
  });
}

export function resolvePrepaymentTemplateRowNo(
  paymentMethod: string
): number {
  const normalized = normalizeCompanyPaymentType(paymentMethod);

  if (normalized === "credit_card") {
    return AGENCY_MESSAGE_TEMPLATE_ROW_1_7;
  }

  if (normalized === "bank_transfer") {
    return AGENCY_MESSAGE_TEMPLATE_ROW_1_6;
  }

  throw new Error(
    "Ön ödeme bilgisi yalnızca Banka Havale/Eft veya Kredi Kartı/Sanal POS ödeme türleri için gönderilebilir"
  );
}

export function buildBookingPaymentLink(
  domain: string,
  reservationCode: string
): string {
  const trimmedDomain = domain.trim().replace(/^https?:\/\//i, "");
  const base = trimmedDomain ? `https://${trimmedDomain}` : "";
  if (!base || !reservationCode.trim()) return "";
  return `${base}/odemeyonlendir/${reservationCode.trim()}`;
}

function resolvePoolHeatingFee(details: BookingDetails): number {
  return (
    (details.poolHeatingPrivateFee ?? 0) +
    (details.poolHeatingIndoorFee ?? 0) +
    (details.poolHeatingKidsFee ?? 0)
  );
}

function buildPaymentTypeLabel(
  paymentMethod: CompanyPaymentTypeValue,
  bankName?: string
): string {
  const label = getCompanyPaymentTypeLabel(paymentMethod);
  if (paymentMethod === "bank_transfer" && bankName?.trim()) {
    return `${label} (${bankName.trim()})`;
  }
  return label;
}

export function buildBookingPrepaymentTemplateValues(input: {
  reservationCode: string;
  guestName: string;
  guestPhone: string;
  villaName: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  details: BookingDetails;
  prepaymentAmount: number;
  paymentMethod: string;
  optionHours: number;
  company: {
    agencyName: string;
    brandName: string;
    companyTitle: string;
    domain: string;
    logoUrl: string;
  };
  bankAccount?: {
    bankName: string;
    accountHolder: string;
    iban: string;
  } | null;
}): Record<string, string> {
  const normalizedPaymentMethod = normalizeCompanyPaymentType(
    input.paymentMethod
  ) as CompanyPaymentTypeValue;
  const nights = calculateNights(input.checkIn, input.checkOut);
  const guestCount = input.adults + input.children;
  const reservationTotal = computeReservationTotal(input.details);
  const totalAmount = reservationTotal ?? input.details.grossPrice ?? 0;
  const cleaningFee = input.details.cleaningFee ?? 0;
  const poolFee = resolvePoolHeatingFee(input.details);
  const damageDeposit = input.details.damageDeposit ?? 0;
  const prepaymentText = formatAgencyMoney(input.prepaymentAmount);
  const dateRange = `${formatAgencyBookingDate(input.checkIn)} - ${formatAgencyBookingDate(input.checkOut)}`;
  const paymentLink = buildBookingPaymentLink(
    input.company.domain,
    input.reservationCode
  );
  const paymentTypeLabel = buildPaymentTypeLabel(
    normalizedPaymentMethod,
    input.bankAccount?.bankName
  );
  const firmName = input.company.brandName || input.company.agencyName;

  const values: Record<string, string> = {
    LOGO: input.company.logoUrl,
    MUSTERIADI: input.guestName,
    MÜŞTERİADI: input.guestName,
    MUSTERITELEFON: input.guestPhone.replace(/\D/g, ""),
    TESİSADI: input.villaName,
    TESISADI: input.villaName,
    REZKOD: input.reservationCode,
    REZNO: input.reservationCode,
    TARIHLER: dateRange,
    GIRISTARIHI: formatAgencyBookingDate(input.checkIn),
    CIKISTARIHI: formatAgencyBookingDate(input.checkOut),
    GUNSAYISI: String(nights),
    KISISAYISI: String(guestCount),
    TOPLAMTUTAR: formatAgencyMoney(totalAmount),
    ONODEME: prepaymentText,
    ÖNÖDEMETUTAR: prepaymentText,
    TEMIZLIKBEDELI: formatAgencyMoney(cleaningFee),
    HAVUZBEDELI: formatAgencyMoney(poolFee),
    HASAR: formatAgencyMoney(damageDeposit),
    ODEMETIPI: paymentTypeLabel,
    SIRKETUNVAN: input.company.companyTitle,
    IBAN: input.bankAccount?.iban ?? "",
    ODENECEKTUTAR: prepaymentText,
    ODEMELINK: paymentLink,
    DOMAIN: input.company.domain,
    FİRMAADI: firmName,
    FIRMAADI: firmName,
    OPSIYONSAATI: formatPrepaymentOptionLabel(input.optionHours),
  };

  return values;
}

export function buildBookingConfirmationTemplateValues(input: {
  reservationCode: string;
  guestName: string;
  guestPhone: string;
  villaName: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  details: BookingDetails;
  prepaymentAmount: number;
  paymentMethod: string;
  company: {
    agencyName: string;
    brandName: string;
    companyTitle: string;
    domain: string;
    logoUrl: string;
  };
  bankAccount?: {
    bankName: string;
    accountHolder: string;
    iban: string;
  } | null;
}): Record<string, string> {
  return buildBookingPrepaymentTemplateValues({
    ...input,
    optionHours: 0,
  });
}
