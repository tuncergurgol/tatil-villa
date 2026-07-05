import * as XLSX from "xlsx";
import { BookingStatus } from "@prisma/client";

export const DEFAULT_BOOKING_EXCEL_PATH =
  "g:/Drive'ım/Rezervasyonlar/Rezervasyon Takip - 2026 yeni.xlsx";

export const BOOKING_SHEET_NAME = "Rezervasyon";
export const BOOKING_HEADER_ROW_INDEX = 3;
export const BOOKING_DATA_START_ROW_INDEX = 4;

export type ExcelBookingRow = {
  rowNumber: number;
  reservationCode: number;
  reservationDate: Date | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  guestCount: number;
  facilityName: string;
  netAmount: number | null;
  prepaymentAmount: number | null;
  reservationStatus: string;
  stayStatus: string;
  paymentMethod: string;
  salesRep: string;
};

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

export const BOOKING_FACILITY_ALIASES: Record<string, string> = {
  "tiny angel house": "villa angel house",
  "tiny angel": "villa angel",
  "villa sehrazat": "bungalov sehrazat",
  "villa mitra": "bungalov mitra",
  "villa mirta": "bungalov mitra",
  "villa leaf": "villa yaprak",
  "villa general": "villa nisan",
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

export function buildImportedGuestEmail(reservationCode: number): string {
  return `import-${reservationCode}@tatildeyiz.local`;
}

function isHeaderLikeRow(cells: unknown[]): boolean {
  const first = cleanText(cells[0]);
  const facility = cleanText(cells[7]);
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

  const rows: ExcelBookingRow[] = [];
  let skippedRows = 0;

  for (let index = BOOKING_DATA_START_ROW_INDEX; index < matrix.length; index++) {
    const cells = matrix[index] ?? [];
    if (isHeaderLikeRow(cells)) {
      skippedRows += 1;
      continue;
    }

    const reservationCode = parseIntField(cells[0]);
    const guestName = cleanText(cells[2]);
    const facilityName = cleanText(cells[7]);
    const checkIn = excelSerialToDate(cells[3]);
    const checkOut = excelSerialToDate(cells[4]);

    if (!reservationCode || !guestName || !facilityName || !checkIn || !checkOut) {
      skippedRows += 1;
      continue;
    }

    rows.push({
      rowNumber: index + 1,
      reservationCode,
      reservationDate: excelSerialToDate(cells[1]),
      guestName,
      guestPhone: "",
      guestEmail: "",
      checkIn,
      checkOut,
      nights: parseIntField(cells[5]),
      guestCount: parseIntField(cells[6], 1),
      facilityName,
      netAmount: parseAmount(cells[10]),
      prepaymentAmount: parseAmount(cells[11]),
      reservationStatus: cleanText(cells[19]),
      stayStatus: cleanText(cells[20]),
      paymentMethod: cleanText(cells[16]),
      salesRep: cleanText(cells[18]),
    });
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
      reservationDate: excelSerialToDate(cells[2]),
      guestName: cleanText(cells[3]),
      guestPhone: cleanText(cells[20]),
      guestEmail: cleanText(cells[21]),
      checkIn,
      checkOut,
      nights: parseIntField(cells[6]),
      guestCount: parseIntField(cells[7], 1),
      facilityName: cleanText(cells[8]),
      netAmount: parseAmount(cells[12]),
      prepaymentAmount: parseAmount(cells[13]),
      reservationStatus: cleanText(cells[24]),
      stayStatus: cleanText(cells[25]),
      paymentMethod: cleanText(cells[18]),
      salesRep: cleanText(cells[23]),
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
