/**
 * Mevcut Rezervasyon Excel dosyasında B sütununa (SİTE ADI) veritabanından site adı yazar.
 *
 *   npx tsx scripts/backfill-booking-excel-site-names.ts
 *   npx tsx scripts/backfill-booking-excel-site-names.ts --dry-run
 *   npx tsx scripts/backfill-booking-excel-site-names.ts "G:/path/to/file.xlsx"
 */
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";
import { parseBookingDetails } from "../lib/booking-form-details";
import {
  BOOKING_DATA_START_ROW_INDEX,
  BOOKING_HEADER_ROW_INDEX,
  BOOKING_SHEET_NAME,
  DEFAULT_BOOKING_EXCEL_PATH,
  standardExcelHasSiteColumn,
} from "../lib/booking-excel-import";
import { formatBookingSiteNameForExcel } from "../lib/booking-excel-rows";

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.find((arg) => !arg.startsWith("-") && arg.endsWith(".xlsx"));
  return {
    dryRun,
    filePath: fileArg ?? DEFAULT_BOOKING_EXCEL_PATH,
  };
}

async function main() {
  const { dryRun, filePath } = parseArgs();
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[BOOKING_SHEET_NAME];
  if (!sheet) {
    throw new Error(`"${BOOKING_SHEET_NAME}" sayfası bulunamadı: ${filePath}`);
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  const headerRow = matrix[BOOKING_HEADER_ROW_INDEX] ?? [];
  if (!standardExcelHasSiteColumn(headerRow)) {
    headerRow[1] = "SİTE ADI";
    const headerAddress = XLSX.utils.encode_cell({
      r: BOOKING_HEADER_ROW_INDEX,
      c: 1,
    });
    sheet[headerAddress] = { t: "s", v: "SİTE ADI" };
    console.log("B sütun başlığı SİTE ADI olarak eklendi.");
  }

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (let rowIndex = BOOKING_DATA_START_ROW_INDEX; rowIndex < matrix.length; rowIndex++) {
    const cells = matrix[rowIndex] ?? [];
    const code = Number.parseInt(String(cells[0] ?? "").trim(), 10);
    if (!Number.isFinite(code) || code <= 0) continue;

    const existingSite = String(cells[1] ?? "").trim();
    if (existingSite) {
      skipped += 1;
      continue;
    }

    const booking = await prisma.booking.findFirst({
      where: { externalCode: code },
      select: { details: true },
    });
    if (!booking) {
      missing += 1;
      console.log(`SKIP ${code}: rezervasyon bulunamadı`);
      continue;
    }

    const details = parseBookingDetails(booking.details);
    const siteName = formatBookingSiteNameForExcel(details.siteInfo);
    if (!dryRun) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
      sheet[address] = { t: "s", v: siteName };
    }
    updated += 1;
    console.log(`${dryRun ? "[dry-run] " : ""}${code} -> ${siteName}`);
  }

  if (!dryRun && updated > 0) {
    XLSX.writeFile(workbook, filePath);
  }

  console.log(
    `\nTamamlandı: ${updated} güncellendi, ${skipped} zaten dolu, ${missing} eşleşmedi${dryRun ? " (dry-run)" : ""}`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
