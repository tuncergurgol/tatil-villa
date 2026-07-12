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
  const normalizedValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    normalizedValues[normalizeAgencyPlaceholderKey(key)] = value;
  }

  return template.replace(/##([^#]+)##/g, (match, rawKey: string) => {
    const key = normalizeAgencyPlaceholderKey(rawKey);
    if (key in normalizedValues) return normalizedValues[key];
    return match;
  });
}

export function normalizeAgencyPlaceholderKey(key: string): string {
  return key.trim().replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
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

const DEFAULT_BOOKING_SITE_FALLBACK = "Tatildeyiz";

function formatWeekdayTr(date: Date): string {
  return date.toLocaleDateString("tr-TR", { weekday: "long" });
}

function setAlias(
  values: Record<string, string>,
  aliases: string[],
  value: string
) {
  for (const alias of aliases) {
    values[alias] = value;
  }
}

/** Yeni rezervasyon talebi (Mesaj İçeriği 1 / 2) placeholder değerleri */
export function buildNewReservationRequestTemplateValues(input: {
  reservationCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  villaName: string;
  villaRegion: string;
  villaCheckInTime: string;
  villaCheckOutTime: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  details: BookingDetails;
  totalPrice: number | null;
  company: {
    agencyName: string;
    brandName: string;
    companyTitle: string;
    domain: string;
    logoUrl: string;
    email: string;
    phone: string;
    address: string;
  };
}): Record<string, string> {
  const nights = calculateNights(input.checkIn, input.checkOut);
  const reservationTotal =
    computeReservationTotal(input.details) ??
    input.totalPrice ??
    input.details.grossPrice ??
    0;
  const prepaymentAmount = input.details.prepaymentAmount ?? 0;
  const checkInPayment =
    input.details.checkInPayment ??
    Math.max(0, reservationTotal - prepaymentAmount);
  const paymentMethod =
    input.details.importPaymentMethod ||
    input.details.prepaymentBank ||
    input.details.paymentMethod ||
    "";
  const paymentTypeLabel = paymentMethod
    ? getCompanyPaymentTypeLabel(paymentMethod)
    : "";
  const firmName =
    input.company.brandName ||
    input.company.agencyName ||
    DEFAULT_BOOKING_SITE_FALLBACK;
  const siteName = DEFAULT_BOOKING_SITE_FALLBACK;
  const dateRange = `${formatAgencyBookingDate(input.checkIn)} - ${formatAgencyBookingDate(input.checkOut)}`;
  const checkInDay = formatWeekdayTr(input.checkIn);
  const checkOutDay = formatWeekdayTr(input.checkOut);
  const phoneDigits = input.guestPhone.replace(/\D/g, "");
  const guestMessage = input.details.customerNote?.trim() || "-";

  const rezDetail = [
    `Rezervasyon No: ${input.reservationCode}`,
    `Misafir: ${input.guestName}`,
    `E-posta: ${input.guestEmail}`,
    `Telefon: ${input.guestPhone}`,
    `Tesis: ${input.villaName}${input.villaRegion ? ` (${input.villaRegion})` : ""}`,
    `Giriş: ${formatAgencyBookingDate(input.checkIn)} ${checkInDay} ${input.villaCheckInTime}`,
    `Çıkış: ${formatAgencyBookingDate(input.checkOut)} ${checkOutDay} ${input.villaCheckOutTime}`,
    `Konaklama: ${nights} Gece`,
    `Misafir: ${input.adults} yetişkin, ${input.children} çocuk, ${input.babies} bebek, ${input.pets} evcil hayvan`,
    `Toplam: ${formatAgencyMoney(reservationTotal)} TL`,
    `Ön Ödeme: ${formatAgencyMoney(prepaymentAmount)} TL (${paymentTypeLabel || "-"})`,
    `Girişte Ödeme: ${formatAgencyMoney(checkInPayment)} TL`,
  ].join("\n");

  const values: Record<string, string> = {
    ...buildBookingPrepaymentTemplateValues({
      reservationCode: input.reservationCode,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      villaName: input.villaName,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      details: input.details,
      prepaymentAmount,
      paymentMethod,
      optionHours: 0,
      company: {
        agencyName: input.company.agencyName,
        brandName: input.company.brandName,
        companyTitle: input.company.companyTitle,
        domain: input.company.domain,
        logoUrl: input.company.logoUrl,
      },
    }),
  };

  const accommodationFee = input.details.grossPrice ?? 0;
  const cleaningFee = input.details.cleaningFee ?? 0;
  const petCleaningFee = input.details.petCleaningFee ?? 0;
  const extraBedFee = input.details.extraAccommodationFee ?? 0;
  const underfloorHeatingFee = input.details.underfloorHeatingFee ?? 0;
  const poolHeatingPrivateFee = input.details.poolHeatingPrivateFee ?? 0;
  const poolHeatingIndoorFee = input.details.poolHeatingIndoorFee ?? 0;
  const poolHeatingKidsFee = input.details.poolHeatingKidsFee ?? 0;

  const absoluteLogoUrl = resolveCompanyLogoUrl(
    input.company.logoUrl,
    input.company.domain
  );

  setAlias(values, ["MUSTERIADI", "MÜŞTERİADI", "MUSTARIADI"], input.guestName);
  setAlias(values, ["MUSTERIMAIL", "MUSTERIEMAIL"], input.guestEmail);
  setAlias(values, ["MUSTERITELEFON"], phoneDigits || input.guestPhone);
  setAlias(
    values,
    ["TESISADI", "TESİSADI", "VILLAADI", "VİLLAADI"],
    input.villaName
  );
  setAlias(values, ["VILLABOLGE", "VİLLABÖLGE", "BOLGE"], input.villaRegion);
  setAlias(values, ["FIRMAADI", "FİRMAADI", "SITEADI", "SİTEADI"], firmName || siteName);
  // Mail HTML’de img olarak basılır; metinde boş bırakılır
  setAlias(values, ["SITELOGO", "SİTELOGO", "LOGO"], "");
  setAlias(values, ["SITELOGOURL", "LOGOURL"], absoluteLogoUrl);
  setAlias(values, ["GIRISTARIHI", "GİRİŞTARİHİ", "TARIH1"], formatAgencyBookingDate(input.checkIn));
  setAlias(values, ["CIKISTARIHI", "ÇIKIŞTARİHİ", "TARIH2"], formatAgencyBookingDate(input.checkOut));
  setAlias(values, ["GIRISGUNU", "GİRİŞGÜNÜ"], checkInDay);
  setAlias(values, ["CIKISGUNU", "ÇIKIŞGÜNÜ", "CIKISGUNI"], checkOutDay);
  setAlias(values, ["VILLACHECKIN", "GIRISSAATI"], input.villaCheckInTime || "16:00");
  setAlias(values, ["VILLACHECKOUT", "CIKISSAATI"], input.villaCheckOutTime || "10:00");
  setAlias(values, ["YETISKIN", "YETİŞKİN", "ADULTS"], String(input.adults));
  setAlias(values, ["COCUK", "ÇOCUK", "CHILDREN"], String(input.children));
  setAlias(values, ["BEBEK", "BABIES"], String(input.babies));
  setAlias(values, ["EVCILHAYVAN", "PETS", "EVCİLHAYVAN"], String(input.pets));
  setAlias(values, ["GUNSAYISI", "GECESAYISI"], String(nights));
  setAlias(values, ["TOPLAMTUTAR"], formatAgencyMoney(reservationTotal));
  setAlias(values, ["ONODEME", "ÖNÖDEMETUTAR"], formatAgencyMoney(prepaymentAmount));
  setAlias(
    values,
    ["GIRISTEODEME", "KALANTUTAR", "GIRISTEODENECEK"],
    formatAgencyMoney(checkInPayment)
  );
  setAlias(values, ["ODEMETIPI"], paymentTypeLabel);
  // Booking.details alanları (JSON) — Ödeme Bilgileri satırları
  setAlias(
    values,
    ["GROSSPRICE", "KONAKLAMABEDELI", "KONAKLAMABEDELİKOMİSYONLU"],
    formatAgencyMoney(accommodationFee)
  );
  setAlias(values, ["CLEANINGFEE", "TEMIZLIKBEDELI"], formatAgencyMoney(cleaningFee));
  setAlias(
    values,
    ["PETCLEANINGFEE", "EVCILHAYVANTEMIZLIKBEDELI"],
    formatAgencyMoney(petCleaningFee)
  );
  setAlias(
    values,
    ["EXTRAACCOMMODATIONFEE", "EKYATAKBEDELI", "EKKONAKLAMABEDELI"],
    formatAgencyMoney(extraBedFee)
  );
  setAlias(
    values,
    ["UNDERFLOORHEATINGFEE", "YERDENISITMA"],
    formatAgencyMoney(underfloorHeatingFee)
  );
  setAlias(
    values,
    ["POOLHEATINGPRIVATEFEE", "HAVUZISITMAOZEL"],
    formatAgencyMoney(poolHeatingPrivateFee)
  );
  setAlias(
    values,
    ["POOLHEATINGINDOORFEE", "HAVUZISITMAKAPALI"],
    formatAgencyMoney(poolHeatingIndoorFee)
  );
  setAlias(
    values,
    ["POOLHEATINGKIDSFEE", "HAVUZISITMACOCUK"],
    formatAgencyMoney(poolHeatingKidsFee)
  );
  setAlias(values, ["REZERVASYONMUSTERIMESAJ", "MUSTERIMESAJ"], guestMessage);
  setAlias(values, ["REZDETAY", "REZERVASYONDETAY"], rezDetail);
  setAlias(values, ["TARIHLER"], dateRange);
  setAlias(values, ["REZKOD", "REZNO"], input.reservationCode);
  setAlias(values, ["SIRKETADRES", "ADRES"], input.company.address || "");
  setAlias(values, ["SIRKETTELEFON", "FIRMATEL"], input.company.phone || "");
  setAlias(values, ["SIRKETMAIL", "INFOMAIL"], input.company.email || "");

  return values;
}

/** CompanySettings.logoUrl → e-posta için mutlak URL */
export function resolveCompanyLogoUrl(
  logoUrl: string | null | undefined,
  domain: string | null | undefined
): string {
  const trimmed = logoUrl?.trim() || "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const host = (domain ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  if (!host) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `https://${host}${path}`;
}
