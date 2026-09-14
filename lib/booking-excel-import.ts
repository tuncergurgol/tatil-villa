import * as XLSX from "xlsx";
import { BookingStatus, StayStatus } from "@prisma/client";
import type { BookingDetails } from "@/lib/booking-form-details";

export const DEFAULT_BOOKING_EXCEL_PATH =
  "G:/Drive'ım/Rezervasyonlar/Rezervasyon Takip - 2026.xlsx";

export const BOOKING_SHEET_NAME = "Rezervasyon";
export const BOOKING_HEADER_ROW_INDEX = 3;
export const BOOKING_DATA_START_ROW_INDEX = 4;

export type ExcelBookingRow = {
  rowNumber: number;
  reservationCode: number;
  siteName: string;
  reservationDate: Date | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  guestCount: number;
  facilityName: string;
  grossAmount: number | null;
  discountAmount: number | null;
  netAmount: number | null;
  prepaymentAmount: number | null;
  balanceAmount: number | null;
  cleaningFee: number | null;
  heatingFee: number | null;
  invoiceAmount: number | null;
  paymentMethod: string;
  agencyName: string;
  salesRep: string;
  reservationStatus: string;
  stayStatus: string;
  ownerAccountingCode: string;
  ownerName: string;
  welcomeMode: string;
  workMode: string;
  commissionRate: number | null;
  commissionAmount: number | null;
  ownerPayableAmount: number | null;
  ownerCollectFromGuest: number | null;
  ownerPaymentDueDate: string;
  ownerPaymentDate: string;
  ownerPaidAmount: number | null;
  agencyCommissionRate: number | null;
  agencyCommissionEarned: number | null;
  agencyExpectedAmount: number | null;
  agencyAccountingCode: string;
  agencyReceivedDate: string;
  agencyReceivedAmount: number | null;
  invoiceDate: string;
  invoiceNo: string;
  invoiceTitle: string;
  issuedInvoiceAmount: number | null;
  salesRepCommissionEarned: number | null;
  invoiceDifference: number | null;
  invoiceAmountDifference: number | null;
  kbsReportable: string;
  commissionInvoiceDifference: number | null;
  guestNationality: string;
  guestNationalId: string;
  guestBirthDate: string;
};

/** Excel Rezervasyon sayfası sütun → veritabanı alan eşlemesi (raporlama için). */
export const BOOKING_EXCEL_COLUMN_MAP = [
  { column: "A", index: 0, header: "REZERVASYON KODU", target: "Booking.externalCode" },
  { column: "B", index: 1, header: "SİTE ADI", target: "details.siteInfo" },
  { column: "C", index: 2, header: "REZERVASYON TARİHİ", target: "Booking.createdAt" },
  { column: "D", index: 3, header: "ADI SOYADI", target: "Booking.guestName" },
  { column: "E", index: 4, header: "GİRİŞ TARİHİ", target: "Booking.checkIn" },
  { column: "F", index: 5, header: "ÇIKIŞ TARİHİ", target: "Booking.checkOut" },
  { column: "G", index: 6, header: "GECE SAYISI", target: "(bilgi) nights" },
  { column: "H", index: 7, header: "KİŞİ SAYISI", target: "Booking.adults" },
  { column: "I", index: 8, header: "TESİS ADI", target: "Booking.villa.name" },
  {
    column: "J",
    index: 9,
    header: "BRÜT REZERVASYON TUTARI",
    target: "details.grossPrice",
  },
  { column: "K", index: 10, header: "İNDİRİM", target: "details.discountAmount" },
  { column: "L", index: 11, header: "NET REZERVASYON TUTARI", target: "Booking.totalPrice" },
  { column: "M", index: 12, header: "ÖN ÖDEME", target: "details.prepaymentAmount" },
  {
    column: "N",
    index: 13,
    header: "REZERVASYON BAKİYESİ",
    target: "details.checkInPayment",
  },
  { column: "O", index: 14, header: "MÜŞTERİDEN ALINACAK TEMİZLİK BEDELİ", target: "details.cleaningFee" },
  { column: "P", index: 15, header: "MÜŞTERİDEN ALINACAK ISITMA BEDELİ", target: "details.heatingFee" },
  { column: "Q", index: 16, header: "FATURA TUTARI", target: "details.invoiceAmount" },
  {
    column: "R",
    index: 17,
    header: "ÖN ÖDEME YÖNTEMİ",
    target: "details.importPaymentMethod",
  },
  { column: "S", index: 18, header: "ACENTE", target: "details.agencyName" },
  { column: "T", index: 19, header: "SATIŞ TEMSİLCİSİ", target: "details.salesRepName" },
  { column: "U", index: 20, header: "REZERVASYON SON DURUM", target: "Booking.status" },
  { column: "V", index: 21, header: "KONAKLAMA DURUMU", target: "Booking.stayStatus" },
  {
    column: "W",
    index: 22,
    header: "VİLLA SAHİBİ MUHASEBE KODU",
    target: "details.importOwnerAccountingCode",
  },
  {
    column: "X",
    index: 23,
    header: "VİLLA SAHİBİ ADI",
    target: "details.importOwnerName",
  },
  { column: "Y", index: 24, header: "KARŞILAMA", target: "details.importWelcomeMode" },
  { column: "Z", index: 25, header: "ÇALIŞMA ŞEKLİ", target: "details.importWorkMode" },
  { column: "AA", index: 26, header: "KOMİSYON ORANI", target: "details.commissionRate" },
  { column: "AB", index: 27, header: "KOMİSYON TUTARI", target: "details.commissionAmount" },
  {
    column: "AC",
    index: 28,
    header: "VİLLA SAHİBİNE ÖDENECEK PARA",
    target: "details.ownerPayableAmount",
  },
  {
    column: "AD",
    index: 29,
    header: "VİLLA SAHİBİNİN MÜŞTERİDEN ALACAĞI PARA",
    target: "details.ownerCollectFromGuest",
  },
  {
    column: "AE",
    index: 30,
    header: "VİLLA SAHİBİ ÖDEME YAPILACAK TARİH",
    target: "details.ownerPaymentDueDate",
  },
  {
    column: "AF",
    index: 31,
    header: "VİLLA SAHİBİNE ÖDENEN TARİHİ",
    target: "details.ownerPaymentDate",
  },
  {
    column: "AG",
    index: 32,
    header: "VİLLA SAHİBİNE ÖDENEN PARA",
    target: "details.ownerPaidAmount",
  },
  {
    column: "AH",
    index: 33,
    header: "ACENTE KOMİSYON ORANI",
    target: "details.agencyCommissionRate",
  },
  {
    column: "AI",
    index: 34,
    header: "ACENTEYE ÖDENECEK KOMİSYON TUTARI",
    target: "details.agencyCommissionEarned",
  },
  {
    column: "AJ",
    index: 35,
    header: "ACENTEDEN GELECEK PARA",
    target: "details.agencyExpectedAmount",
  },
  {
    column: "AK",
    index: 36,
    header: "ACENTE MUHASEBE KODU",
    target: "details.importAgencyAccountingCode",
  },
  {
    column: "AL",
    index: 37,
    header: "ACENTEDEN GELEN PARA TARİHİ",
    target: "details.agencyReceivedDate",
  },
  {
    column: "AM",
    index: 38,
    header: "ACENTEDEN GELEN PARA TUTARI",
    target: "details.agencyReceivedAmount",
  },
  { column: "AN", index: 39, header: "FATURA TARİHİ", target: "details.invoiceDate" },
  { column: "AO", index: 40, header: "FATURA NO", target: "details.invoiceNo" },
  { column: "AP", index: 41, header: "ADI SOYADI", target: "details.invoiceTitle" },
  {
    column: "AQ",
    index: 42,
    header: "FATURA TUTARI",
    target: "details.issuedInvoiceAmount",
  },
  { column: "AR", index: 43, header: "PRİM", target: "details.salesRepCommissionEarned" },
  { column: "AS", index: 44, header: "FARK", target: "details.invoiceDifference" },
  { column: "AT", index: 45, header: " FATURA FARK", target: "details.invoiceAmountDifference" },
  { column: "AU", index: 46, header: "KBS ", target: "villa.kbsReportable" },
  {
    column: "AV",
    index: 47,
    header: "Komisyon-Fatura FarkI",
    target: "(computed) commissionInvoiceDifference",
  },
  { column: "AW", index: 48, header: "TELEFON", target: "Booking.guestPhone" },
  { column: "AX", index: 49, header: "E-POSTA", target: "Booking.guestEmail" },
  { column: "AY", index: 50, header: "UYRUK", target: "details.adultGuests[0].nationality" },
  {
    column: "AZ",
    index: 51,
    header: "TC KİMLİK / PASAPORT NO",
    target: "details.guestTc / adultGuests[0].nationalId",
  },
  { column: "BA", index: 52, header: "DOĞUM TARİHİ", target: "(reserved)" },
] as const;

export const BOOKING_EXCEL_HEADERS = BOOKING_EXCEL_COLUMN_MAP.map(
  (column) => column.header
);

export function formatBookingStatusForExcel(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return "Onayladı";
    case BookingStatus.CANCELLED:
      return "İptal";
    case BookingStatus.COMPENSATION:
      return "Tazminat";
    case BookingStatus.CONFIRMATION_SENT:
      return "Konfirme";
    case BookingStatus.PREPAYMENT:
      return "Ön Ödeme";
    case BookingStatus.NEW:
      return "Yeni";
    default:
      return status;
  }
}

export type BookingExcelFormat = "standard" | "weekly";

export const WEEKLY_BOOKING_SHEET_NAME = "Table1";
export const WEEKLY_HEADER_ROW_INDEX = 0;
export const WEEKLY_DATA_START_ROW_INDEX = 1;

export type ParsedBookingExcel = {
  rows: ExcelBookingRow[];
  skippedRows: number;
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const text = cleanText(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseIntField(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function excelSerialToDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const text = cleanText(value);
  if (!text) return null;
  const trMatch = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (trMatch) {
    const [, day, month, year] = trMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }
  const iso = new Date(text);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function excelCellToDateKey(value: unknown): string {
  const date = excelSerialToDate(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export const BOOKING_FACILITY_ALIASES: Record<string, string> = {
  "tiny angel house": "villa angel house",
  "tiny angel": "villa angel",
  "villa sehrazat": "bungalov sehrazat",
  "villa mitra": "bungalov mitra",
  "villa mirta": "bungalov mitra",
  "villa leaf": "villa yaprak",
  "villa general": "villa nisan",
  "villa eylem": "villa optimum",
  "villa sehir": "villa seyirtepe 1",
  "bungalov yakova 2": "bungalov lost 2",
  "bungalov yakova 1": "bungalov lost 1",
  "villa ilkan": "villa casa lemon garden",
  "villa olimpia": "villa albatros",
  "villa gizli bahce": "villa secret haven",
  "villa white smith": "villa mecanblu",
};

export function normalizeFacilityName(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mapReservationStatus(value: string): BookingStatus {
  const text = normalizeFacilityName(value);
  if (text.includes("iptal")) return BookingStatus.CANCELLED;
  if (text.includes("tazminat")) return BookingStatus.COMPENSATION;
  if (text.includes("konfirme")) return BookingStatus.CONFIRMATION_SENT;
  if (text.includes("on odeme") || text.includes("onodeme")) {
    return BookingStatus.PREPAYMENT;
  }
  if (text.includes("onay")) return BookingStatus.CONFIRMED;
  return BookingStatus.NEW;
}

export function isConfirmedExcelReservationStatus(value: string): boolean {
  return mapReservationStatus(value) === BookingStatus.CONFIRMED;
}

export function mapStayStatus(value: string): StayStatus {
  const text = normalizeFacilityName(value);
  if (text.includes("yapilmadi")) return StayStatus.YAPILMADI;
  if (text.includes("yapildi")) return StayStatus.YAPILDI;
  return StayStatus.BEKLENIYOR;
}

export function buildImportedGuestEmail(reservationCode: number): string {
  return `import-${reservationCode}@tatildeyiz.local`;
}

export type BookingImportPayload = {
  villaId: string;
  externalCode: number;
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
  createdAt: Date;
  details: BookingDetails & Record<string, unknown>;
};

export function buildBookingImportPayload(
  row: ExcelBookingRow,
  villaId: string,
  format: BookingExcelFormat,
  guest: { guestName: string; guestEmail: string; guestPhone: string }
): BookingImportPayload {
  const commissionAmount =
    row.commissionAmount ??
    (row.invoiceAmount != null ? Math.max(0, Math.round(row.invoiceAmount)) : null);

  const guestTc = row.guestNationalId || undefined;
  const adultGuests =
    guestTc || row.guestNationality
      ? [
          {
            name: guest.guestName.split(" ")[0] ?? guest.guestName,
            surname: guest.guestName.split(" ").slice(1).join(" "),
            nationalId: guestTc || "",
            plate: "",
            nationality: row.guestNationality || "TC",
          },
        ]
      : undefined;

  return {
    villaId,
    externalCode: row.reservationCode,
    checkIn: row.checkIn!,
    checkOut: row.checkOut!,
    adults: Math.max(row.guestCount, 1),
    children: 0,
    babies: 0,
    pets: 0,
    guestName: guest.guestName,
    guestEmail: guest.guestEmail,
    guestPhone: guest.guestPhone,
    totalPrice: row.netAmount,
    status: mapReservationStatus(row.reservationStatus),
    stayStatus: mapStayStatus(row.stayStatus),
    createdAt: row.reservationDate ?? row.checkIn!,
    details: {
      source: "excel-import",
      importSource: format,
      grossPrice: row.grossAmount,
      discountAmount: row.discountAmount,
      prepaymentAmount: row.prepaymentAmount,
      checkInPayment: row.balanceAmount,
      cleaningFee: row.cleaningFee,
      heatingFee: row.heatingFee,
      invoiceAmount: row.invoiceAmount,
      commissionAmount,
      commissionRate: row.commissionRate,
      importPaymentMethod: row.paymentMethod,
      paymentMethod: row.paymentMethod,
      agencyName: row.agencyName,
      salesRepName: row.salesRep,
      importOwnerAccountingCode: row.ownerAccountingCode,
      importOwnerName: row.ownerName,
      importWelcomeMode: row.welcomeMode,
      importWorkMode: row.workMode,
      ownerPayableAmount: row.ownerPayableAmount,
      ownerCollectFromGuest: row.ownerCollectFromGuest,
      ownerPaymentDueDate: row.ownerPaymentDueDate,
      ownerPaymentDate: row.ownerPaymentDate,
      ownerPaidAmount: row.ownerPaidAmount,
      agencyCommissionRate: row.agencyCommissionRate,
      agencyCommissionEarned: row.agencyCommissionEarned,
      agencyExpectedAmount: row.agencyExpectedAmount,
      importAgencyAccountingCode: row.agencyAccountingCode,
      agencyReceivedDate: row.agencyReceivedDate,
      agencyReceivedAmount: row.agencyReceivedAmount,
      invoiceDate: row.invoiceDate,
      invoiceNo: row.invoiceNo,
      invoiceTitle: row.invoiceTitle,
      issuedInvoiceAmount: row.issuedInvoiceAmount,
      salesRepCommissionEarned: row.salesRepCommissionEarned,
      invoiceDifference: row.invoiceDifference,
      invoiceAmountDifference: row.invoiceAmountDifference,
      guestTc,
      guestCountry: row.guestNationality || undefined,
      siteInfo: row.siteName || undefined,
      adultGuests,
      activityLogs: [
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          action: "status_changed",
          message: "Excel import ile onaylandı",
          actorName: "Sistem",
          meta: { from: "NEW", to: "CONFIRMED", source: "excel-import" },
        },
      ],
    },
  };
}

function parseRowFromStandardCells(
  cells: unknown[],
  rowNumber: number,
  hasSiteColumn: boolean
): ExcelBookingRow | null {
  const offset = hasSiteColumn ? 1 : 0;
  const reservationCode = parseIntField(cells[0]);
  const guestName = cleanText(cells[2 + offset]);
  const facilityName = cleanText(cells[7 + offset]);
  const checkIn = excelSerialToDate(cells[3 + offset]);
  const checkOut = excelSerialToDate(cells[4 + offset]);

  if (!reservationCode || !guestName || !facilityName || !checkIn || !checkOut) {
    return null;
  }

  return {
    rowNumber,
    reservationCode,
    siteName: hasSiteColumn ? cleanText(cells[1]) : "",
    reservationDate: excelSerialToDate(cells[1 + offset]),
    guestName,
    guestPhone: cleanText(cells[47 + offset]),
    guestEmail: cleanText(cells[48 + offset]),
    checkIn,
    checkOut,
    nights: parseIntField(cells[5 + offset]),
    guestCount: parseIntField(cells[6 + offset], 1),
    facilityName,
    grossAmount: parseAmount(cells[8 + offset]),
    discountAmount: parseAmount(cells[9 + offset]),
    netAmount: parseAmount(cells[10 + offset]),
    prepaymentAmount: parseAmount(cells[11 + offset]),
    balanceAmount: parseAmount(cells[12 + offset]),
    cleaningFee: parseAmount(cells[13 + offset]),
    heatingFee: parseAmount(cells[14 + offset]),
    invoiceAmount: parseAmount(cells[15 + offset]),
    paymentMethod: cleanText(cells[16 + offset]),
    agencyName: cleanText(cells[17 + offset]),
    salesRep: cleanText(cells[18 + offset]),
    reservationStatus: cleanText(cells[19 + offset]),
    stayStatus: cleanText(cells[20 + offset]),
    ownerAccountingCode: cleanText(cells[21 + offset]),
    ownerName: cleanText(cells[22 + offset]),
    welcomeMode: cleanText(cells[23 + offset]),
    workMode: cleanText(cells[24 + offset]),
    commissionRate: parseAmount(cells[25 + offset]),
    commissionAmount: parseAmount(cells[26 + offset]),
    ownerPayableAmount: parseAmount(cells[27 + offset]),
    ownerCollectFromGuest: parseAmount(cells[28 + offset]),
    ownerPaymentDueDate: excelCellToDateKey(cells[29 + offset]),
    ownerPaymentDate: excelCellToDateKey(cells[30 + offset]),
    ownerPaidAmount: parseAmount(cells[31 + offset]),
    agencyCommissionRate: parseAmount(cells[32 + offset]),
    agencyCommissionEarned: parseAmount(cells[33 + offset]),
    agencyExpectedAmount: parseAmount(cells[34 + offset]),
    agencyAccountingCode: cleanText(cells[35 + offset]),
    agencyReceivedDate: excelCellToDateKey(cells[36 + offset]),
    agencyReceivedAmount: parseAmount(cells[37 + offset]),
    invoiceDate: excelCellToDateKey(cells[38 + offset]),
    invoiceNo: cleanText(cells[39 + offset]),
    invoiceTitle: cleanText(cells[40 + offset]),
    issuedInvoiceAmount: parseAmount(cells[41 + offset]),
    salesRepCommissionEarned: parseAmount(cells[42 + offset]),
    invoiceDifference: parseAmount(cells[43 + offset]),
    invoiceAmountDifference: parseAmount(cells[44 + offset]),
    kbsReportable: cleanText(cells[45 + offset]),
    commissionInvoiceDifference: parseAmount(cells[46 + offset]),
    guestNationality: cleanText(cells[49 + offset]),
    guestNationalId: cleanText(cells[50 + offset]),
    guestBirthDate: excelCellToDateKey(cells[51 + offset]),
  };
}

export function standardExcelHasSiteColumn(headerRow: unknown[] | undefined): boolean {
  const header = cleanText(headerRow?.[1]).toLocaleUpperCase("tr-TR");
  return header.includes("SİTE ADI") || header.includes("SITE ADI");
}

function isHeaderLikeRow(cells: unknown[], hasSiteColumn: boolean): boolean {
  const first = cleanText(cells[0]);
  const facility = cleanText(cells[7 + (hasSiteColumn ? 1 : 0)]);
  if (!first && !facility) return true;
  if (first.toLocaleUpperCase("tr-TR").includes("REZERVASYON KODU")) return true;
  if (/^[1-9]\d{0,2}$/.test(first) && !facility) return true;
  return false;
}

export function readBookingRowsFromWorkbook(
  workbook: XLSX.WorkBook,
  sheetName = BOOKING_SHEET_NAME
): ParsedBookingExcel {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`"${sheetName}" sayfası bulunamadı.`);
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  const hasSiteColumn = standardExcelHasSiteColumn(matrix[BOOKING_HEADER_ROW_INDEX]);
  const rows: ExcelBookingRow[] = [];
  let skippedRows = 0;

  for (let index = BOOKING_DATA_START_ROW_INDEX; index < matrix.length; index++) {
    const cells = matrix[index] ?? [];
    if (isHeaderLikeRow(cells, hasSiteColumn)) {
      skippedRows += 1;
      continue;
    }

    const row = parseRowFromStandardCells(cells, index + 1, hasSiteColumn);
    if (!row) {
      skippedRows += 1;
      continue;
    }

    rows.push(row);
  }

  return { rows, skippedRows };
}

export function readBookingRowsFromFile(filePath: string): ParsedBookingExcel {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  return readBookingRowsFromWorkbook(workbook);
}

function isWeeklyHeaderRow(cells: unknown[]): boolean {
  const joined = cells
    .map((cell) => cleanText(cell).toLocaleLowerCase("tr-TR"))
    .join("|");
  return joined.includes("rezkodu") && joined.includes("telefonnumarasi");
}

export function detectBookingExcelFormat(filePath: string): BookingExcelFormat {
  const workbook = XLSX.readFile(filePath, { sheetRows: 2, cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return "standard";

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
  }) as unknown[][];

  const header = matrix[WEEKLY_HEADER_ROW_INDEX] ?? [];
  return isWeeklyHeaderRow(header) ? "weekly" : "standard";
}

function isWeeklyDataRow(cells: unknown[]): boolean {
  const reservationCode = parseIntField(cells[0]);
  const guestName = cleanText(cells[3]);
  const facilityName = cleanText(cells[8]);
  return Boolean(reservationCode && guestName && facilityName);
}

export function readWeeklyBookingRowsFromWorkbook(
  workbook: XLSX.WorkBook,
  sheetName = WEEKLY_BOOKING_SHEET_NAME
): ParsedBookingExcel {
  const sheet = workbook.Sheets[sheetName] ?? workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) {
    throw new Error("Haftalık rezervasyon sayfası bulunamadı.");
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  const rows: ExcelBookingRow[] = [];
  let skippedRows = 0;

  for (
    let index = WEEKLY_DATA_START_ROW_INDEX;
    index < matrix.length;
    index += 1
  ) {
    const cells = matrix[index] ?? [];
    if (!isWeeklyDataRow(cells)) {
      skippedRows += 1;
      continue;
    }

    const checkIn = excelSerialToDate(cells[4]);
    const checkOut = excelSerialToDate(cells[5]);
    if (!checkIn || !checkOut) {
      skippedRows += 1;
      continue;
    }

    rows.push({
      rowNumber: index + 1,
      reservationCode: parseIntField(cells[0]),
      siteName: "",
      reservationDate: excelSerialToDate(cells[2]),
      guestName: cleanText(cells[3]),
      guestPhone: cleanText(cells[20]),
      guestEmail: cleanText(cells[21]),
      checkIn,
      checkOut,
      nights: parseIntField(cells[6]),
      guestCount: parseIntField(cells[7], 1),
      facilityName: cleanText(cells[8]),
      grossAmount: parseAmount(cells[10]),
      discountAmount: parseAmount(cells[11]),
      netAmount: parseAmount(cells[12]),
      prepaymentAmount: parseAmount(cells[13]),
      balanceAmount: parseAmount(cells[14]),
      cleaningFee: parseAmount(cells[15]),
      heatingFee: parseAmount(cells[16]),
      invoiceAmount: parseAmount(cells[17]),
      paymentMethod: cleanText(cells[18]),
      agencyName: cleanText(cells[22]),
      salesRep: cleanText(cells[23]),
      reservationStatus: cleanText(cells[24]),
      stayStatus: cleanText(cells[25]),
      ownerAccountingCode: "",
      ownerName: "",
      welcomeMode: "",
      workMode: "",
      commissionRate: null,
      commissionAmount: null,
      ownerPayableAmount: null,
      ownerCollectFromGuest: null,
      ownerPaymentDueDate: "",
      ownerPaymentDate: "",
      ownerPaidAmount: null,
      agencyCommissionRate: null,
      agencyCommissionEarned: null,
      agencyExpectedAmount: null,
      agencyAccountingCode: "",
      agencyReceivedDate: "",
      agencyReceivedAmount: null,
      invoiceDate: "",
      invoiceNo: "",
      invoiceTitle: "",
      issuedInvoiceAmount: null,
      salesRepCommissionEarned: null,
      invoiceDifference: null,
      invoiceAmountDifference: null,
      kbsReportable: "",
      commissionInvoiceDifference: null,
      guestNationality: "",
      guestNationalId: "",
      guestBirthDate: "",
    });
  }

  return { rows, skippedRows };
}

export function readWeeklyBookingRowsFromFile(filePath: string): ParsedBookingExcel {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  return readWeeklyBookingRowsFromWorkbook(workbook);
}

export function readBookingRowsFromFileAuto(filePath: string): {
  format: BookingExcelFormat;
  parsed: ParsedBookingExcel;
} {
  const format = detectBookingExcelFormat(filePath);
  const parsed =
    format === "weekly"
      ? readWeeklyBookingRowsFromFile(filePath)
      : readBookingRowsFromFile(filePath);
  return { format, parsed };
}

export type VillaLookupEntry = {
  id: string;
  name: string;
  originalName: string;
};

export function buildVillaLookup(villas: VillaLookupEntry[]) {
  const byKey = new Map<string, VillaLookupEntry>();

  for (const villa of villas) {
    for (const candidate of [villa.name, villa.originalName]) {
      const key = normalizeFacilityName(candidate);
      if (key && !byKey.has(key)) {
        byKey.set(key, villa);
      }
    }
  }

  return {
    resolve(facilityName: string): VillaLookupEntry | null {
      const key = normalizeFacilityName(facilityName);
      if (!key) return null;

      const aliasTarget = BOOKING_FACILITY_ALIASES[key];
      if (aliasTarget) {
        const aliased = byKey.get(aliasTarget);
        if (aliased) return aliased;
      }

      const exact = byKey.get(key);
      if (exact) return exact;

      const withoutTiny = key.replace(/^tiny\s+/, "").trim();
      if (withoutTiny !== key) {
        const tinyMatch = byKey.get(withoutTiny) ?? byKey.get(`villa ${withoutTiny}`);
        if (tinyMatch) return tinyMatch;
      }

      const withoutVilla = key.replace(/^villa\s+/, "").trim();
      if (withoutVilla !== key) {
        const match = byKey.get(withoutVilla);
        if (match) return match;
      }

      const withVilla = `villa ${key}`;
      const prefixed = byKey.get(withVilla);
      if (prefixed) return prefixed;

      let best: VillaLookupEntry | null = null;
      for (const [candidateKey, villa] of byKey.entries()) {
        if (candidateKey.includes(key) || key.includes(candidateKey)) {
          if (!best || candidateKey.length > normalizeFacilityName(best.name).length) {
            best = villa;
          }
        }
      }

      return best;
    },
  };
}
