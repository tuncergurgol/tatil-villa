import {
  AGENCY_MESSAGE_TEMPLATE_ROW_1_6,
  AGENCY_MESSAGE_TEMPLATE_ROW_1_7,
  AGENCY_MESSAGE_TEMPLATE_ROW_10_2,
  AGENCY_MESSAGE_TEMPLATE_ROW_10_3,
} from "@/lib/agency-message-row-no";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import {
  computeGuestReservationTotal,
  computeReservationTotal,
  normalizeBookingSiteInfo,
  type BookingDetails,
} from "@/lib/booking-form-details";
import { formatPrepaymentOptionLabel } from "@/lib/booking-prepayment-share";
import {
  getCompanyPaymentTypeLabel,
  normalizeCompanyPaymentType,
  type CompanyPaymentTypeValue,
} from "@/lib/company-payment-types";
import { calculateNights } from "@/lib/stay-nights";

export function formatAgencyBookingDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString("tr-TR", { month: "long" });
  const monthLabel = month.charAt(0).toLocaleUpperCase("tr-TR") + month.slice(1);
  return `${day}.${monthLabel}.${date.getFullYear()}`;
}

export function formatAgencyMoney(amount: number): string {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("tr-TR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function renderAgencyMessageTemplate(
  template: string,
  values: Record<string, string>
): string {
  const normalizedValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    normalizedValues[normalizeAgencyPlaceholderKey(key)] = value;
  }

  const normalizedTemplate = normalizeLegacyAgencyMessageTemplate(template);

  return normalizedTemplate.replace(
    /##([^#\]]+?)(?:##|##\])/g,
    (match, rawKey: string) => {
      const key = normalizeAgencyPlaceholderKey(rawKey);
      if (key in normalizedValues) return normalizedValues[key] ?? "";
      return match;
    }
  );
}

/**
 * Mail/şablon metninden tutarı 0 TL olan satırları çıkarır
 * (ör. "Evcil Hayvan Temizlik Bedeli : 0 TL").
 */
export function stripZeroAmountLines(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/:\s*0(?:[.,]0+)?\s*TL\s*$/i.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function normalizeAgencyPlaceholderKey(key: string): string {
  return key.trim().replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
}

/** HH:MM — villa giriş/çıkış saatleri */
export function normalizeVillaTimeHHMM(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed || "10:00";
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Çıkış saati aralığı — bitiş villa çıkış saati, başlangıç 1 saat önce */
export function formatVillaCheckoutTimeRange(
  checkOutTime: string | null | undefined
): string {
  const end = normalizeVillaTimeHHMM(checkOutTime);
  const [hourRaw, minuteRaw] = end.split(":");
  const endMinutes = Number(hourRaw) * 60 + Number(minuteRaw);
  const startMinutes = Math.max(0, endMinutes - 60);
  const startHour = String(Math.floor(startMinutes / 60)).padStart(2, "0");
  const startMinute = String(startMinutes % 60).padStart(2, "0");
  return `${startHour}:${startMinute}-${end}`;
}

/** Orijinal tesis adı boşsa parantez bloğu gösterilmez */
export function formatVillaOriginalNameBlock(
  originalName: string | null | undefined
): string {
  const trimmed = (originalName ?? "").trim();
  return trimmed ? ` (${trimmed})` : "";
}

/** Eski şablonlardaki ##:## ve hatalı ##] kapanışlarını normalize eder */
export function normalizeLegacyAgencyMessageTemplate(template: string): string {
  return template
    .replace(/\(##:##-##:##\)/g, "##CIKISSAATARALIGI##")
    .replace(/##:##/g, "##CIKISSAATI##");
}

/** Render sonrası boş parantez ve çözülemeyen placeholder kalıntılarını temizler */
export function cleanupAgencyMessageRenderedText(text: string): string {
  return text
    .replace(/\s*\(\s*\)/g, "")
    .replace(/\(\s*\]/g, "")
    .replace(/\(\s*(?=[,.;!\s]|$)/g, "")
    .replace(/##[^#\n]*?##\]?/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Ödeme kanalına göre ön ödeme şablon rowNo adayları (öncelik sırasıyla).
 * Banka → 10.2 (102), eski fallback 1.6 (16)
 * Kredi kartı → 10.3 (103), eski fallback 1.7 (17)
 */
export function resolvePrepaymentTemplateRowNos(
  paymentMethod: string
): number[] {
  const normalized = normalizeCompanyPaymentType(paymentMethod);

  if (normalized === "credit_card") {
    return [
      AGENCY_MESSAGE_TEMPLATE_ROW_10_3,
      AGENCY_MESSAGE_TEMPLATE_ROW_1_7,
    ];
  }

  if (normalized === "bank_transfer") {
    return [
      AGENCY_MESSAGE_TEMPLATE_ROW_10_2,
      AGENCY_MESSAGE_TEMPLATE_ROW_1_6,
    ];
  }

  throw new Error(
    "Ön ödeme bilgisi yalnızca Banka Havale/Eft veya Kredi Kartı/Sanal POS ödeme türleri için gönderilebilir"
  );
}

export function resolvePrepaymentTemplateRowNo(
  paymentMethod: string
): number {
  return resolvePrepaymentTemplateRowNos(paymentMethod)[0];
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

const DEFAULT_PUBLIC_BOOKING_DOMAIN = "www.tatildeyiz.com.tr";

/** localhost / 127.0.0.1 — müşteri mesajlarında asla kullanılmaz */
export function isLocalConfirmationBaseUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(
      trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? ""
    );
  }
}

/**
 * Konfirme / giriş-bilgilendirme link tabanı:
 * - Verilen public domain (site markası) önceliklidir
 * - Admin/localhost domain yok sayılır
 * - `BOOKING_CONFIRMATION_BASE_URL` yalnızca domain boş/geçersizse fallback
 */
export function resolveBookingConfirmationBaseUrl(domain: string): string {
  const trimmedDomain = (domain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  if (
    trimmedDomain &&
    !isLocalConfirmationBaseUrl(trimmedDomain) &&
    !/^bont\./i.test(trimmedDomain)
  ) {
    return `https://${trimmedDomain}`;
  }

  const envBase = (process.env.BOOKING_CONFIRMATION_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (
    envBase &&
    !isLocalConfirmationBaseUrl(envBase) &&
    !/bont\./i.test(envBase)
  ) {
    return envBase.replace(/^http:\/\//i, "https://");
  }

  return `https://${DEFAULT_PUBLIC_BOOKING_DOMAIN}`;
}

/** Misafir konfirme onay formu linki (`/onay?rezId=&mail=`) */
export function buildBookingConfirmationLink(
  domain: string,
  reservationCode: string,
  guestEmail?: string
): string {
  const base = resolveBookingConfirmationBaseUrl(domain);
  const code = reservationCode.trim();
  if (!base || !code) return "";
  const params = new URLSearchParams({ rezId: code });
  const mail = (guestEmail ?? "").trim();
  // Placeholder import mailleri doğrulama için kullanılamaz; linke yazma
  if (mail && !isImportedPlaceholderEmail(mail)) {
    params.set("mail", mail);
  }
  return `${base}/onay?${params.toString()}`;
}

/**
 * WhatsApp/Evolution: markdown `[metin](url)` tıklanabilir olmaz.
 * CTA satırını düz metin + ayrı satırda ham https URL'ye çevirir.
 */
export function ensureWhatsAppRawConfirmationUrl(message: string): string {
  return message.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, href: string) => `${label}\n${href}`
  );
}

/** Şirket telefonunu mail/WA için okunabilir +90 formatına çevirir */
export function formatCompanyPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("90") && local.length >= 12) {
    local = local.slice(2);
  }
  if (local.length === 10) {
    return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
  }
  if (trimmed.startsWith("+")) return trimmed;
  return trimmed;
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
  guestEmail?: string;
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
    email?: string;
    phone?: string;
    address?: string;
  };
  bankAccount?: {
    bankName: string;
    accountHolder: string;
    iban: string;
  } | null;
}): Record<string, string> {
  const values = buildBookingPrepaymentTemplateValues({
    ...input,
    optionHours: 0,
  });

  const confirmationLink = buildBookingConfirmationLink(
    input.company.domain,
    input.reservationCode,
    input.guestEmail
  );
  const firmPhone = formatCompanyPhoneDisplay(input.company.phone ?? "");
  const firmEmail = (input.company.email ?? "").trim();
  const firmAddress = (input.company.address ?? "").trim();
  const absoluteLogoUrl = resolveCompanyLogoUrl(
    input.company.logoUrl,
    input.company.domain
  );

  setAlias(values, ["MUSTERIADI", "MÜŞTERİADI", "MISAFIRADI", "MİSAFİRADI"], input.guestName);
  setAlias(
    values,
    ["REZKOD", "REZNO", "REZERVASYONKODU", "REZERVASYONKOD"],
    input.reservationCode
  );
  setAlias(values, ["ONAYLINK", "CONFIRMATIONLINK", "KONFIRMELINK"], confirmationLink);
  // Mail HTML’de img olarak basılır; metinde boş bırakılır
  setAlias(values, ["SITELOGO", "SİTELOGO", "LOGO"], "");
  setAlias(values, ["SITELOGOURL", "LOGOURL"], absoluteLogoUrl);
  setAlias(values, ["SIRKETADRES", "ADRES"], firmAddress);
  setAlias(values, ["SIRKETTELEFON", "FIRMATEL", "FIRMATELEFON"], firmPhone);
  setAlias(values, ["SIRKETMAIL", "INFOMAIL"], firmEmail);

  return values;
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
    computeGuestReservationTotal(input.details) ??
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
    normalizeBookingSiteInfo(input.details.siteInfo) ||
    input.company.brandName ||
    input.company.agencyName ||
    DEFAULT_BOOKING_SITE_FALLBACK;
  const siteName = normalizeBookingSiteInfo(input.details.siteInfo);
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
  const checkInTime = normalizeVillaTimeHHMM(input.villaCheckInTime || "16:00");
  const checkOutTime = normalizeVillaTimeHHMM(input.villaCheckOutTime || "10:00");
  const checkOutRange = formatVillaCheckoutTimeRange(checkOutTime);
  setAlias(values, ["VILLACHECKIN", "GIRISSAATI"], checkInTime);
  setAlias(values, ["VILLACHECKOUT", "CIKISSAATI"], checkOutTime);
  setAlias(
    values,
    ["CIKISSAATARALIGI", "CIKISSAATIARALIK", "CIKISSAATARALIK"],
    checkOutRange
  );
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

/**
 * Giriş bilgilendirme URL kodu: sıralı externalCode değil, Booking.id (cuid).
 * Tahmin edilemez; public sayfa yalnızca bu kod + kısa cuid son eki ile açılır.
 */
export function resolveCheckInInfoShareCode(bookingId: string): string {
  return bookingId.trim();
}

/** Public giriş-bilgilendirme yolu (önizleme / relative) */
export function buildCheckInInfoSharePath(
  shareCode: string,
  audience: "guest" | "owner" = "guest"
): string {
  const code = shareCode.trim();
  if (!code) return "";
  return audience === "owner"
    ? `/giris-bilgilendirme/${code}/evsahibi`
    : `/giris-bilgilendirme/${code}`;
}

/**
 * Müşteriye gönderilen mutlak giriş bilgilendirme linki.
 * ONAYLINK ile aynı taban (localhost müşteriye gitmez).
 * `shareCode` = Booking.id (cuid); ##REZID## metninden ayrıdır.
 */
export function buildCheckInInfoShareLink(
  domain: string,
  shareCode: string,
  audience: "guest" | "owner" = "guest"
): string {
  const base = resolveBookingConfirmationBaseUrl(domain);
  const path = buildCheckInInfoSharePath(shareCode, audience);
  if (!base || !path) return "";
  return `${base}${path}`;
}

/**
 * Mesaj İçeriği 11.1 (111) / 40.1 (401) — giriş bilgilendirme.
 * Guest: müşteri şablonu; owner: villa yetkilisi (KARŞILAYAN) şablonu.
 * Link alias’ları ve 401’deki yazım varyantları (vVILLAADI, rREZID vb.) burada doldurulur.
 */
export function buildCheckInInfoShareTemplateValues(input: {
  /** Mesajdaki ##REZID## — insan okunur rezervasyon no (externalCode) */
  reservationCode: string;
  /**
   * URL’deki güvenli kod (Booking.id / cuid).
   * Verilmezse rezervasyon no kullanılır (eski davranış; önerilmez).
   */
  shareCode?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  villaName: string;
  /** Villa.originalName — ##VILLAORJINALADI## */
  villaOriginalName?: string;
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
  audience: "guest" | "owner";
  recipientName?: string;
  greeterName?: string;
  greeterPhone?: string;
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
  const values = buildNewReservationRequestTemplateValues(input);
  const recipientName = (input.recipientName ?? input.guestName).trim();
  const shareCode =
    resolveCheckInInfoShareCode(input.shareCode ?? "") ||
    input.reservationCode.trim();
  const infoLink = buildCheckInInfoShareLink(
    input.company.domain,
    shareCode,
    input.audience
  );
  const greeterName = (input.greeterName ?? "").trim();
  const greeterPhone = (input.greeterPhone ?? "").trim();
  const villaOriginalName = (input.villaOriginalName ?? "").trim();
  const greeterLabel = greeterName || recipientName;

  setAlias(
    values,
    [
      "REZID",
      "RREZID",
      "REZKOD",
      "REZNO",
      "REZERVASYONKODU",
      "REZERVASYONKOD",
      "PNR",
    ],
    input.reservationCode
  );
  setAlias(
    values,
    [
      "MUSTERIGIRIŞBILGILENDIRMELINK",
      "MUSTERIGIRISBILGILENDIRMELINK",
      "BILGILINK",
      "GIRISBILGILINK",
      "CHECKININFOLINK",
      "EVSAHIBIGIRISLINK",
      "EVSAHIBILINK",
      "YETKILIGIRISLINK",
    ],
    infoLink
  );
  setAlias(
    values,
    [
      "MÜŞTERİKARŞILAYAN",
      "MUSTERIKARSILAYAN",
      "KARSILAYANADI",
      "KARSILAYAN",
      "KARŞILAYAN",
      "YETKILIADI",
      "YETKİLİADI",
      "ALICIADI",
      "HITAPADI",
    ],
    greeterLabel
  );
  setAlias(
    values,
    [
      "MÜŞTERİKARŞILAYANTELEFON",
      "MUSTERIKARSILAYANTELEFON",
      "KARSILAYANTELEFON",
    ],
    greeterPhone.replace(/\D/g, "") || greeterPhone
  );
  // DB şablon 401: ##vVILLAADI## → VVILLAADI
  setAlias(
    values,
    ["VVILLAADI", "TESISADI", "TESİSADI", "VILLAADI", "VİLLAADI"],
    input.villaName
  );
  setAlias(
    values,
    [
      "VILLAORJINALADI",
      "VILLAORIGINALADI",
      "ORJINALADI",
      "ORIGINALADI",
      "TESISORJINALADI",
      "TESİSORJİNALADI",
      "TESISORJINALADISADE",
      "TESİSORJİNALADISADE",
    ],
    villaOriginalName
  );
  setAlias(
    values,
    [
      "TESISORJINALADIBLOK",
      "TESISORJINALADIPARENTEZ",
      "TESISORJINALADIPARANTEZ",
    ],
    formatVillaOriginalNameBlock(villaOriginalName)
  );

  return values;
}
