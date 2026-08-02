/**
 * Excel Rezervasyon sayfasından onaylı rezervasyonları içe aktarır.
 *
 *   npx tsx scripts/import-bookings-from-excel.ts --dry-run
 *   npx tsx scripts/import-bookings-from-excel.ts
 *   npx tsx scripts/import-bookings-from-excel.ts "G:/path/to/file.xlsx"
 *   npx tsx scripts/import-bookings-from-excel.ts --all-statuses
 *
 * Varsayılan: yalnızca REZERVASYON SON DURUM = Onaylandı satırları,
 * externalCode (A sütunu) veritabanında yoksa kayıt oluşturur.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  normalizeGuestEmail,
  resolveGuestPhone,
} from "../lib/booking-guest-contact";
import {
  BOOKING_EXCEL_COLUMN_MAP,
  buildBookingImportPayload,
  buildImportedGuestEmail,
  buildVillaLookup,
  DEFAULT_BOOKING_EXCEL_PATH,
  isConfirmedExcelReservationStatus,
  readBookingRowsFromFileAuto,
  type ExcelBookingRow,
} from "../lib/booking-excel-import";
import { syncBookingStayOccupancy } from "../lib/villa-occupancy-service";

type ImportError = {
  row: number;
  reservationCode: number;
  facilityName: string;
  guestName: string;
  reason: string;
};

type ImportStats = {
  created: number;
  updated: number;
  skippedExisting: number;
  skippedNotConfirmed: number;
  skippedInvalid: number;
  unmatchedVilla: number;
};

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const replaceImported = argv.includes("--replace-imported");
  const confirmedOnly = !argv.includes("--all-statuses");
  const fileArg = argv.find(
    (arg) => !arg.startsWith("--") && !arg.startsWith("--report=")
  );
  const reportArg = argv.find((arg) => arg.startsWith("--report="));
  const filePath = fileArg ?? DEFAULT_BOOKING_EXCEL_PATH;
  const reportPath = reportArg
    ? resolve(reportArg.slice("--report=".length))
    : resolve("scripts/import-bookings-report.json");

  return { dryRun, replaceImported, confirmedOnly, filePath, reportPath };
}

function resolveGuestFields(row: ExcelBookingRow) {
  const guestName = row.guestName.trim();
  const guestPhone = resolveGuestPhone(row.guestPhone);
  const guestEmail =
    normalizeGuestEmail(row.guestEmail) ||
    buildImportedGuestEmail(row.reservationCode);

  return { guestName, guestPhone, guestEmail };
}

async function main() {
  const { dryRun, replaceImported, confirmedOnly, filePath, reportPath } =
    parseArgs(process.argv.slice(2));

  if (!existsSync(filePath)) {
    throw new Error(`Excel dosyası bulunamadı: ${filePath}`);
  }

  console.log(`Kaynak: ${filePath}`);
  console.log(dryRun ? "Mod: dry-run" : "Mod: import");
  console.log(
    confirmedOnly
      ? "Filtre: yalnızca Onaylandı"
      : "Filtre: tüm durumlar (--all-statuses)"
  );

  const { format, parsed } = readBookingRowsFromFileAuto(filePath);
  console.log(`Format: ${format}`);
  console.log(`Okunan rezervasyon satırı: ${parsed.rows.length}`);
  if (parsed.skippedRows > 0) {
    console.log(`Atlanan boş/geçersiz satır: ${parsed.skippedRows}`);
  }

  const villas = await prisma.villa.findMany({
    select: { id: true, name: true, originalName: true },
  });
  const lookup = buildVillaLookup(villas);

  if (!dryRun && replaceImported) {
    const deleted = await prisma.booking.deleteMany({
      where: {
        guestEmail: { endsWith: "@tatildeyiz.local" },
      },
    });
    console.log(`Önceki import kayıtları silindi: ${deleted.count}`);
  }

  const existingBookings = await prisma.booking.findMany({
    where: { externalCode: { not: null } },
    select: { id: true, externalCode: true },
  });
  const existingByCode = new Map(
    existingBookings.map((item) => [String(item.externalCode), item.id])
  );

  const stats: ImportStats = {
    created: 0,
    updated: 0,
    skippedExisting: 0,
    skippedNotConfirmed: 0,
    skippedInvalid: 0,
    unmatchedVilla: 0,
  };
  const errors: ImportError[] = [];
  const creates: Array<ReturnType<typeof buildBookingImportPayload>> = [];
  const updates: Array<{
    id: string;
    data: ReturnType<typeof buildBookingImportPayload>;
  }> = [];
  const unmatchedFacilities = new Map<string, number>();

  for (const row of parsed.rows) {
    if (confirmedOnly && !isConfirmedExcelReservationStatus(row.reservationStatus)) {
      stats.skippedNotConfirmed += 1;
      continue;
    }

    if (!row.checkIn || !row.checkOut || row.checkOut <= row.checkIn) {
      stats.skippedInvalid += 1;
      errors.push({
        row: row.rowNumber,
        reservationCode: row.reservationCode,
        facilityName: row.facilityName,
        guestName: row.guestName,
        reason: "Geçersiz giriş/çıkış tarihi",
      });
      continue;
    }

    const villa = lookup.resolve(row.facilityName);
    if (!villa) {
      stats.unmatchedVilla += 1;
      const key = row.facilityName.trim();
      unmatchedFacilities.set(key, (unmatchedFacilities.get(key) ?? 0) + 1);
      errors.push({
        row: row.rowNumber,
        reservationCode: row.reservationCode,
        facilityName: row.facilityName,
        guestName: row.guestName,
        reason: "Villa eşleşmedi",
      });
      continue;
    }

    const guest = resolveGuestFields(row);
    const data = buildBookingImportPayload(row, villa.id, format, guest);
    const existingId = existingByCode.get(String(row.reservationCode));

    if (existingId) {
      if (format === "weekly") {
        updates.push({ id: existingId, data });
        stats.updated += 1;
      } else {
        stats.skippedExisting += 1;
      }
      continue;
    }

    creates.push(data);
    stats.created += 1;
  }

  if (!dryRun) {
    for (const data of creates) {
      const created = await prisma.booking.create({
        data: {
          ...data,
          details: data.details as Prisma.InputJsonValue,
        },
      });
      await syncBookingStayOccupancy({
        villaId: data.villaId,
        previous: {
          status: "NEW",
          checkIn: data.checkIn,
          checkOut: data.checkOut,
        },
        next: {
          status: data.status,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
        },
      });
    }

    for (const { id, data } of updates) {
      const existing = await prisma.booking.findUnique({
        where: { id },
        select: {
          status: true,
          checkIn: true,
          checkOut: true,
          villaId: true,
        },
      });
      if (!existing) continue;

      await prisma.booking.update({
        where: { id },
        data: {
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          totalPrice: data.totalPrice,
          status: data.status,
          stayStatus: data.stayStatus,
          details: data.details as Prisma.InputJsonValue,
        },
      });

      await syncBookingStayOccupancy({
        villaId: existing.villaId,
        previous: {
          status: existing.status,
          checkIn: existing.checkIn,
          checkOut: existing.checkOut,
        },
        next: {
          status: data.status,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
        },
      });
    }

    if (creates.length > 0 || updates.length > 0) {
      const { syncAllCustomersFromBookings } = await import(
        "../lib/customer-from-booking"
      );
      const customerSync = await syncAllCustomersFromBookings();
      console.log(
        `Müşteri senkronu: ${customerSync.created} yeni, ${customerSync.updated} güncellendi (toplam ${customerSync.totalCustomers})`
      );
    }
  }

  const report = {
    filePath,
    format,
    dryRun,
    confirmedOnly,
    replaceImported,
    columnMapping: BOOKING_EXCEL_COLUMN_MAP,
    parsedRows: parsed.rows.length,
    stats,
    unmatchedFacilities: Array.from(unmatchedFacilities.entries())
      .map(([facilityName, count]) => ({ facilityName, count }))
      .sort((a, b) => b.count - a.count),
    errors,
    sampleCreates: creates.slice(0, 5).map((item) => ({
      externalCode: item.externalCode,
      guestName: item.guestName,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      totalPrice: item.totalPrice,
      status: item.status,
      stayStatus: item.stayStatus,
    })),
    sampleUpdates: updates.slice(0, 5).map((item) => ({
      id: item.id,
      externalCode: item.data.externalCode,
      guestName: item.data.guestName,
    })),
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("--- Sonuç ---");
  console.log(`Oluşturulacak/oluşturulan: ${stats.created}`);
  console.log(`Güncellenecek/güncellenen: ${stats.updated}`);
  console.log(`Zaten vardı: ${stats.skippedExisting}`);
  console.log(`Onaylı değil (atlandı): ${stats.skippedNotConfirmed}`);
  console.log(`Geçersiz satır: ${stats.skippedInvalid}`);
  console.log(`Villa eşleşmeyen: ${stats.unmatchedVilla}`);
  console.log(`Rapor: ${reportPath}`);

  if (unmatchedFacilities.size > 0) {
    console.log("\nEşleşmeyen tesis adları:");
    for (const [name, count] of Array.from(unmatchedFacilities.entries()).slice(
      0,
      15
    )) {
      console.log(`- ${name} (${count} satır)`);
    }
  }

  if (errors.length > 0) {
    console.log("\nİlk hatalar:");
    for (const error of errors.slice(0, 10)) {
      console.log(
        `- Satır ${error.row} / #${error.reservationCode} / ${error.facilityName}: ${error.reason}`
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
