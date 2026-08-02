import { existsSync } from "fs";
import * as XLSX from "xlsx";
import { BookingStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { calculateNights } from "@/lib/stay-nights";
import { getStayStatusLabel } from "@/lib/stay-status";
import {
  BOOKING_DATA_START_ROW_INDEX,
  BOOKING_SHEET_NAME,
  DEFAULT_BOOKING_EXCEL_PATH,
} from "@/lib/booking-excel-import";

export type BookingExcelExportResult =
  | { ok: true; action: "appended" | "skipped"; reason?: string; row?: number }
  | { ok: false; error: string };

export function getBookingExcelPath(): string {
  return process.env.BOOKING_EXCEL_PATH?.trim() || DEFAULT_BOOKING_EXCEL_PATH;
}

export function isBookingExcelExportAvailable(
  filePath = getBookingExcelPath()
): boolean {
  return Boolean(filePath) && existsSync(filePath);
}

function dateToExcelSerial(date: Date): number {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  return (utc - Date.UTC(1899, 11, 30)) / 86_400_000;
}

function formatReservationStatusLabel(): string {
  return "Onayladı";
}

function formatSalesTypeLabel(value: string | null | undefined): string {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "kiralama") return "KİRALAMA";
  return "KOMİSYON";
}

export function buildBookingExcelRowValues(input: {
  externalCode: number;
  createdAt: Date;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  facilityName: string;
  totalPrice: number | null;
  stayStatus: string;
  details: ReturnType<typeof parseBookingDetails>;
  ownerAccountingCode?: string | null;
  ownerName?: string | null;
  salesType?: string | null;
}): unknown[] {
  const details = input.details;
  const guestCount = Math.max(input.adults + input.children, 1);
  const nights = calculateNights(input.checkIn, input.checkOut);
  const grossPrice = details.grossPrice ?? null;
  const discountAmount = details.discountAmount ?? null;
  const prepaymentAmount = details.prepaymentAmount ?? null;
  const balanceAmount = details.checkInPayment ?? null;

  return [
    input.externalCode,
    dateToExcelSerial(input.createdAt),
    input.guestName,
    dateToExcelSerial(input.checkIn),
    dateToExcelSerial(input.checkOut),
    nights,
    guestCount,
    input.facilityName,
    grossPrice ?? "",
    discountAmount ?? "",
    input.totalPrice ?? "",
    prepaymentAmount ?? "",
    balanceAmount ?? "",
    details.cleaningFee ?? "",
    details.heatingFee ?? "",
    details.invoiceAmount ?? "",
    details.importPaymentMethod || details.paymentMethod || "",
    details.agencyName || "Tatil Villacısı",
    details.salesRepName || "",
    formatReservationStatusLabel(),
    getStayStatusLabel(
      input.stayStatus as Parameters<typeof getStayStatusLabel>[0]
    ),
    details.importOwnerAccountingCode || input.ownerAccountingCode || "",
    details.importOwnerName || input.ownerName || "",
    details.importWelcomeMode || "KENDİSİ",
    details.importWorkMode || formatSalesTypeLabel(input.salesType),
    details.commissionRate ?? "",
  ];
}

function findReservationCodeRow(
  matrix: unknown[][],
  reservationCode: number
): number | null {
  for (let index = BOOKING_DATA_START_ROW_INDEX; index < matrix.length; index++) {
    const code = Number.parseInt(String(matrix[index]?.[0] ?? "").trim(), 10);
    if (code === reservationCode) return index;
  }
  return null;
}

function findNextDataRow(matrix: unknown[][]): number {
  for (let index = BOOKING_DATA_START_ROW_INDEX; index < matrix.length; index++) {
    const code = String(matrix[index]?.[0] ?? "").trim();
    if (!code) return index;
  }
  return matrix.length;
}

function writeRowToSheet(
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
      if (column === 1 || column === 3 || column === 4) {
        sheet[address] = { t: "n", v: value, z: "dd/mm/yyyy" };
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

export async function exportConfirmedBookingToExcel(
  bookingId: string,
  filePath = getBookingExcelPath()
): Promise<BookingExcelExportResult> {
  if (!isBookingExcelExportAvailable(filePath)) {
    return {
      ok: true,
      action: "skipped",
      reason: `Excel dosyası bulunamadı: ${filePath}`,
    };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      externalCode: true,
      status: true,
      stayStatus: true,
      createdAt: true,
      guestName: true,
      checkIn: true,
      checkOut: true,
      adults: true,
      children: true,
      totalPrice: true,
      details: true,
      villa: {
        select: {
          name: true,
          originalName: true,
          salesType: true,
          owner: {
            select: {
              name: true,
              accountingCode: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false, error: "Rezervasyon bulunamadı" };
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return {
      ok: true,
      action: "skipped",
      reason: "Rezervasyon onaylı değil",
    };
  }

  if (booking.externalCode == null) {
    return { ok: false, error: "Rezervasyon kodu (externalCode) yok" };
  }

  const details = parseBookingDetails(booking.details);
  if (details.excelExportedAt) {
    return {
      ok: true,
      action: "skipped",
      reason: "Daha önce Excel'e yazılmış",
    };
  }

  if (
    details.importSource === "standard" ||
    details.importSource === "weekly" ||
    details.source === "excel-import"
  ) {
    return {
      ok: true,
      action: "skipped",
      reason: "Excel import kaynağı — tekrar yazılmadı",
    };
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[BOOKING_SHEET_NAME];
  if (!sheet) {
    return { ok: false, error: `"${BOOKING_SHEET_NAME}" sayfası bulunamadı` };
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  const existingRow = findReservationCodeRow(matrix, booking.externalCode);
  if (existingRow != null) {
    await markBookingExcelExported(bookingId, details, {
      row: existingRow + 1,
      note: "excel-existing-row",
    });
    return {
      ok: true,
      action: "skipped",
      reason: "Rezervasyon kodu Excel'de zaten var",
      row: existingRow + 1,
    };
  }

  const rowIndex = findNextDataRow(matrix);
  const values = buildBookingExcelRowValues({
    externalCode: booking.externalCode,
    createdAt: booking.createdAt,
    guestName: booking.guestName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    adults: booking.adults,
    children: booking.children,
    facilityName: booking.villa.originalName || booking.villa.name,
    totalPrice: booking.totalPrice,
    stayStatus: booking.stayStatus,
    details,
    ownerAccountingCode: booking.villa.owner?.accountingCode,
    ownerName: booking.villa.owner?.name,
    salesType: booking.villa.salesType,
  });

  writeRowToSheet(sheet, rowIndex, values);
  XLSX.writeFile(workbook, filePath);

  await markBookingExcelExported(bookingId, details, {
    row: rowIndex + 1,
    note: "excel-appended",
  });

  return { ok: true, action: "appended", row: rowIndex + 1 };
}

async function markBookingExcelExported(
  bookingId: string,
  details: ReturnType<typeof parseBookingDetails>,
  meta: { row: number; note: string }
) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      details: {
        ...details,
        excelExportedAt: new Date().toISOString(),
        excelExportRow: meta.row,
        excelExportNote: meta.note,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function handleBookingConfirmedTransition(
  bookingId: string,
  previousStatus: BookingStatus | null | undefined
) {
  if (previousStatus === BookingStatus.CONFIRMED) return;
  try {
    const result = await exportConfirmedBookingToExcel(bookingId);
    if (!result.ok) {
      console.error("[booking-excel-export]", bookingId, result.error);
      return;
    }
    if (result.action === "appended") {
      console.info(
        `[booking-excel-export] ${bookingId} satır ${result.row} eklendi`
      );
    }
  } catch (error) {
    console.error("[booking-excel-export]", bookingId, error);
  }
}
