import * as XLSX from "xlsx";

/** Rezervasyon Excel sütun indeksleri (0-based) — tarih hücreleri */
export const BOOKING_EXCEL_DATE_COLUMNS = new Set([2, 4, 5, 30, 31, 37, 39]);

export const BOOKING_EXCEL_DATE_FORMAT = "dd/mm/yyyy";

export function writeBookingExcelRowToSheet(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  values: unknown[]
) {
  for (let column = 0; column < values.length; column += 1) {
    const value = values[column];
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: column });
    if (value === "" || value == null) {
      sheet[address] = { t: "s", v: "" };
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      if (BOOKING_EXCEL_DATE_COLUMNS.has(column)) {
        sheet[address] = {
          t: "n",
          v: value,
          z: BOOKING_EXCEL_DATE_FORMAT,
        };
      } else {
        sheet[address] = { t: "n", v: value };
      }
      continue;
    }
    sheet[address] = { t: "s", v: String(value) };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  if (rowIndex > range.e.r) range.e.r = rowIndex;
  if (values.length - 1 > range.e.c) range.e.c = values.length - 1;
  sheet["!ref"] = XLSX.utils.encode_range(range);
}

export function buildBookingExcelWorksheet(rows: unknown[][]): XLSX.WorkSheet {
  const sheet: XLSX.WorkSheet = {};
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    writeBookingExcelRowToSheet(sheet, rowIndex, rows[rowIndex] ?? []);
  }
  if (rows.length === 0) {
    sheet["!ref"] = "A1";
  }
  return sheet;
}
