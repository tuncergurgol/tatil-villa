/**
 * EDM Portal Excel fatura yükleme şablonu (EDMPortalExcelFaturaYuklemeOrnegi.xlsx).
 * Client tarafından da import edilebilir; DB/Prisma bağımlılığı yoktur.
 */

import { getOwnerDisplayName } from "@/lib/btrans-report";
import { getMernisIlceByCode } from "@/lib/mernis-ilce";

export type InvoiceReportDateBasis =
  | "checkIn"
  | "approvedAt"
  | "createdAt";

export const INVOICE_REPORT_DATE_BASIS_OPTIONS: {
  value: InvoiceReportDateBasis;
  label: string;
}[] = [
  { value: "checkIn", label: "Giriş Tarihi (varsayılan)" },
  { value: "approvedAt", label: "Onay Tarihi" },
  { value: "createdAt", label: "Oluşturma Tarihi" },
];

/** EDM şablonundaki sütun sayısı (EDMPortalExcelFaturaYuklemeOrnegi.xlsx → 112). */
export const EDM_INVOICE_COLUMN_COUNT = 112;

/** EDM şablonundaki 82+30 sütun başlığı (sıra ve metin birebir). */
export const EDM_INVOICE_EXCEL_HEADERS: (string | number)[] = [
  1111111111,
  "GİB Fatura Senaryosu",
  "GİB Fatura Türü",
  "Gönderici VKN/TCKN",
  "Alıcı VKN/TCKN",
  "Alıcı Unvan",
  "Alıcı E-Posta Adresi",
  "Alıcı Vergi Dairesi",
  "Uyruk",
  "Pasaport Numarası",
  "Pasaportun Verildiği Tarih",
  "Alıcı Adres",
  "Ülke",
  "Ülke Kodu",
  "İl",
  "İlçe",
  "Fatura Tarihi",
  "Fatura No",
  "Sipariş Numarası",
  "Sipariş Tarihi",
  "İrsaliye Numarası",
  "İrsaliye Tarihi",
  "Notlar",
  "Web Adresi",
  "Ödeme Şekli",
  "Ödeme Tarihi",
  "Ödeme Aracısı",
  "Gönderim Tarihi",
  "Gönderiyi Taşıyan İsmi veya Unvanı",
  "Gönderiyi Taşıyan VKN veya TCKN",
  "Üretici Ürün Kodu",
  "Alıcı Ürün Kodu",
  "Satıcı Ürün Kodu ",
  "Vergi Muafiyet Kodu (İstisna-Özel Matrah)",
  "Tevkifat Kodu",
  "Tevkifat Oranı",
  "Sıra No",
  "Mal/Hizmet",
  "Miktar",
  "Birim",
  "Birim Fiyat",
  "İndirim Oranı (%)",
  "KDV Oranı (%)",
  "BMV Oranı (%)",
  "Kdv'siz Tutar",
  "İndirim Tutar",
  "Kdv'li Tutar",
  "Mal hizmet satırları için gümrük takip no",
  "Eşyanın Teslim ve Bedelinin Ödeme Yeri",
  "Teslim Şartı",
  "GTİP No",
  "Eşyanın Gönderilme Şekli",
  "Eşyanın bulunduğu kabın numarası",
  "Eşyanın Bulunduğu Kabın Cinsi ve Nevi",
  "Eşyanın bulunduğu kabın adedi",
  "Eşyanın gönderilme şekli havayolu ise detayları",
  "Eşyanın gönderilme şekli denizyolu ise detayları",
  "Eşyanın gönderilme şekli demiryolu ise detayları",
  "Eşyanın gönderilme şekli karayolu ise detayları",
  "Eşyanın bulunduğu kabın markası",
  "Konaklama Vergisi (%)",
  "Ödeme Hesap No",
  "Harcama Birimi Vergi No",
  "Alıcı Telefon Numarası",
  "Döviz Birimi",
  "Döviz Kuru",
  "Mağaza No",
  "Fatura Kod List",
  "Malveren Numarası",
  "Matbu Numarası",
  "İadeye Tabi Fatura",
  "İadeye Tabi Fatura Tarihi",
  "Kalem Notu",
  "İlaç - Küresel Ticari Ürün Numarası",
  "İlaç - Parti Numarası",
  "İlaç - Sıra Numarası",
  "İlaç - Son Kullanma Tarihi",
  "TıbbiCihaz - Ürün Numarası",
  "TıbbiCihaz - Lot/BatchNumarası",
  "TıbbiCihaz - Seri/Sıra Numarası",
  "TıbbiCihaz - Üretim Tarihi",
  "Bedelsiz",
  ...Array.from(
    { length: EDM_INVOICE_COLUMN_COUNT - 82 },
    () => ""
  ),
];

/** EDM Portal col 0: e-Arşiv yükleme kanalı */
const FIXED_INVOICE_CHANNEL = "E-ARSIV";
/** EDM Portal col 1: GİB e-Arşiv fatura senaryosu */
const FIXED_SCENARIO = "EARSIVFATURA";

export type InvoiceReportIncompleteRow = {
  bookingId: string;
  externalCode: string;
  guestName: string;
  villaName: string;
  ownerName: string;
  checkIn: string;
  missing: string[];
};

export type InvoiceReportOwnerInput = {
  type: "GERCEK_KISI" | "TUZEL_KISI";
  name: string;
  firstName: string;
  lastName: string;
  companyTitle: string;
  tcKimlikNo: string;
  taxNumber: string;
  address: string;
  country: string;
  mernisIlceCode: string | null;
} | null;

/** Tazminat: misafire fatura; onaylı rezervasyon: villa sahibine. */
export type InvoiceReportRecipientKind = "owner" | "guest";

export type InvoiceReportGuestInput = {
  title: string;
  taxNumber: string;
  address: string;
  country: string;
  city: string;
  district: string;
} | null;

export type InvoiceReportBookingInput = {
  bookingId: string;
  externalCode: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  commissionAmount: number;
  owner: InvoiceReportOwnerInput;
  villa: { name: string };
  /** Varsayılan: villa sahibi. Tazminatta `guest`. */
  recipientKind?: InvoiceReportRecipientKind;
  guest?: InvoiceReportGuestInput;
  /** Fatura / gönderim tarihi (tazminatta giriş+1). */
  invoiceDate?: Date | null;
};

export type InvoiceReportCompanyInput = {
  taxNumber: string;
};

const COL = {
  invoiceChannel: 0,
  scenario: 1,
  invoiceType: 2,
  senderTaxNo: 3,
  recipientTaxNo: 4,
  recipientTitle: 5,
  recipientAddress: 11,
  country: 12,
  countryCode: 13,
  city: 14,
  district: 15,
  invoiceDate: 16,
  notes: 22,
  sendDate: 27,
  lineNo: 36,
  lineDescription: 37,
  quantity: 38,
  unit: 39,
  unitPrice: 40,
  discountRate: 41,
  vatRate: 42,
  netAmount: 44,
  discountAmount: 45,
  grossAmount: 46,
} as const;

const FIXED_INVOICE_TYPE = "SATIS";
const FIXED_LINE_DESCRIPTION = "ACENTE HİZMET BEDELİ";
const VAT_RATE = 20;
const VAT_DIVISOR = 1.2;

function emptyRow(): (string | number)[] {
  return Array.from({ length: EDM_INVOICE_COLUMN_COUNT }, () => "");
}

function toEdmTaxNumber(value: string): number | "" {
  const digits = normalizeTaxNumber(value);
  if (!digits) return "";
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : "";
}

function normalizeTaxNumber(value: string): string {
  return value.replace(/\D/g, "");
}

function formatEdmDate(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const d = value.getDate().toString().padStart(2, "0");
  const m = (value.getMonth() + 1).toString().padStart(2, "0");
  const y = value.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatNotesDate(value: Date): string {
  const d = value.getDate().toString().padStart(2, "0");
  const m = (value.getMonth() + 1).toString().padStart(2, "0");
  const y = value.getFullYear();
  return `${d}/${m}/${y}`;
}

function resolveOwnerTaxNumber(owner: NonNullable<InvoiceReportOwnerInput>): string {
  if (owner.type === "TUZEL_KISI") {
    return normalizeTaxNumber(owner.taxNumber);
  }
  return normalizeTaxNumber(owner.tcKimlikNo);
}

function resolveCountryCode(country: string): string {
  const normalized = country.trim().toLocaleLowerCase("tr");
  if (
    normalized === "türkiye" ||
    normalized === "turkiye" ||
    normalized === "turkey"
  ) {
    return "TR";
  }
  return "";
}

function resolveOwnerRegion(owner: NonNullable<InvoiceReportOwnerInput>) {
  const mernis = getMernisIlceByCode(owner.mernisIlceCode);
  return {
    city: mernis?.ilAdi ?? "",
    district: mernis?.ilceAdi ?? "",
  };
}

function ownerDisplayName(owner: NonNullable<InvoiceReportOwnerInput>) {
  return getOwnerDisplayName({
    type: owner.type,
    name: owner.name,
    firstName: owner.firstName,
    lastName: owner.lastName,
    companyTitle: owner.companyTitle,
    tcKimlikNo: owner.tcKimlikNo,
    taxNumber: owner.taxNumber,
    bankIban: "",
    phone: "",
    email: "",
  });
}

function splitCommissionAmounts(commissionGross: number) {
  const gross = Math.round(commissionGross);
  const net = Math.round(gross / VAT_DIVISOR);
  return { net, gross };
}

export function checkInvoiceReportMissingFields(
  booking: InvoiceReportBookingInput,
  company: InvoiceReportCompanyInput
): string[] {
  const missing: string[] = [];
  const recipientKind = booking.recipientKind ?? "owner";

  if (!normalizeTaxNumber(company.taxNumber)) {
    missing.push("Gönderici VKN (Şirket ayarları)");
  }

  const invoiceDate = booking.invoiceDate ?? booking.checkIn;
  if (!formatEdmDate(invoiceDate)) missing.push("Fatura tarihi");
  if (booking.commissionAmount <= 0) {
    missing.push(
      recipientKind === "guest" ? "Tazminat tutarı" : "Komisyon bedeli"
    );
  }

  if (recipientKind === "guest") {
    const guest = booking.guest;
    if (!guest) {
      missing.push("Misafir fatura bilgisi yok");
      return missing;
    }
    if (!normalizeTaxNumber(guest.taxNumber)) {
      missing.push("Misafir TC / vergi numarası");
    }
    if (!guest.title.trim()) missing.push("Misafir fatura ünvanı");
    if (!guest.address.trim()) missing.push("Misafir adresi");
    if (!guest.country.trim()) missing.push("Misafir ülke");
    if (!guest.city.trim() || !guest.district.trim()) {
      missing.push("Misafir il / ilçe");
    }
    return missing;
  }

  const owner = booking.owner;
  if (!owner) {
    missing.push("Villa sahibi tanımlı değil");
    return missing;
  }

  const recipientTaxNo = resolveOwnerTaxNumber(owner);
  const ownerName = ownerDisplayName(owner);
  const { city, district } = resolveOwnerRegion(owner);

  if (!recipientTaxNo) {
    missing.push(
      owner.type === "TUZEL_KISI"
        ? "Villa sahibi vergi numarası"
        : "Villa sahibi TC kimlik no"
    );
  }
  if (!ownerName) missing.push("Villa sahibi adı / ünvan");
  if (!owner.address.trim()) missing.push("Villa sahibi adresi");
  if (!owner.country.trim()) missing.push("Villa sahibi ülke");
  if (!city || !district) missing.push("Villa sahibi il / ilçe");

  return missing;
}

export function buildInvoiceReportRow(
  booking: InvoiceReportBookingInput,
  company: InvoiceReportCompanyInput
): (string | number)[] {
  const row = emptyRow();
  const recipientKind = booking.recipientKind ?? "owner";
  const { net, gross } = splitCommissionAmounts(booking.commissionAmount);
  const invoiceDate = booking.invoiceDate ?? booking.checkIn;
  const invoiceDateLabel = formatEdmDate(invoiceDate);
  const reservationCode = booking.externalCode || booking.bookingId;

  row[COL.invoiceChannel] = FIXED_INVOICE_CHANNEL;
  row[COL.scenario] = FIXED_SCENARIO;
  row[COL.invoiceType] = FIXED_INVOICE_TYPE;
  row[COL.senderTaxNo] = toEdmTaxNumber(company.taxNumber);

  if (recipientKind === "guest") {
    const guest = booking.guest!;
    row[COL.recipientTaxNo] = toEdmTaxNumber(guest.taxNumber);
    row[COL.recipientTitle] = guest.title.trim();
    row[COL.recipientAddress] = guest.address.trim();
    row[COL.country] = guest.country.trim().toLocaleUpperCase("tr");
    row[COL.countryCode] = resolveCountryCode(guest.country);
    row[COL.city] = guest.city.trim().toLocaleUpperCase("tr");
    row[COL.district] = guest.district.trim().toLocaleUpperCase("tr");
  } else {
    const owner = booking.owner!;
    const { city, district } = resolveOwnerRegion(owner);
    row[COL.recipientTaxNo] = toEdmTaxNumber(resolveOwnerTaxNumber(owner));
    row[COL.recipientTitle] = ownerDisplayName(owner);
    row[COL.recipientAddress] = owner.address.trim();
    row[COL.country] = owner.country.trim().toLocaleUpperCase("tr");
    row[COL.countryCode] = resolveCountryCode(owner.country);
    row[COL.city] = city.toLocaleUpperCase("tr");
    row[COL.district] = district.toLocaleUpperCase("tr");
  }

  row[COL.invoiceDate] = invoiceDateLabel;
  row[COL.sendDate] = invoiceDateLabel;
  row[COL.notes] =
    `${reservationCode} - ${booking.guestName.trim()} - ${booking.villa.name.trim()} - ${formatNotesDate(booking.checkIn)} - ${formatNotesDate(booking.checkOut)}`;
  row[COL.lineNo] = 1;
  row[COL.lineDescription] = FIXED_LINE_DESCRIPTION;
  row[COL.quantity] = 1;
  row[COL.unit] = "Adet";
  row[COL.unitPrice] = net;
  row[COL.discountRate] = 0;
  row[COL.vatRate] = VAT_RATE;
  row[COL.netAmount] = net;
  row[COL.discountAmount] = 0;
  row[COL.grossAmount] = gross;

  return row;
}

export function buildInvoiceReportFilename(year: number, month: number) {
  return `edm-fatura-raporu-${year}-${String(month).padStart(2, "0")}.xlsx`;
}

export function buildInvoiceReportExportFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `edm-fatura-raporu-${year}-${month}-${day}.xlsx`;
}

export function isWithinMonth(date: Date, year: number, month: number) {
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}
