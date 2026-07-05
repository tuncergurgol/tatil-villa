import { PrismaClient } from "@prisma/client";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  normalizeGuestEmail,
  resolveGuestPhone,
} from "../lib/booking-guest-contact";
import {
  buildVillaLookup,
  DEFAULT_BOOKING_EXCEL_PATH,
  mapReservationStatus,
  readBookingRowsFromFileAuto,
  type ExcelBookingRow,
} from "../lib/booking-excel-import";

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
  skippedInvalid: number;
  unmatchedVilla: number;
};

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const replaceImported = argv.includes("--replace-imported");
  const fileArg = argv.find((arg) => !arg.startsWith("--"));
  const reportArg = argv.find((arg) => arg.startsWith("--report="));
  const filePath = fileArg ?? DEFAULT_BOOKING_EXCEL_PATH;
  const reportPath = reportArg
    ? resolve(reportArg.slice("--report=".length))
    : resolve("scripts/import-bookings-report.json");

  return { dryRun, replaceImported, filePath, reportPath };
}

function resolveGuestFields(row: ExcelBookingRow) {
  return {
    guestName: row.guestName.trim(),
    guestPhone: resolveGuestPhone(row.guestPhone),
    guestEmail: normalizeGuestEmail(row.guestEmail),
  };
}

async function main() {
  const { dryRun, replaceImported, filePath, reportPath } = parseArgs(
    process.argv.slice(2)
  );

  if (!existsSync(filePath)) {
    throw new Error(`Excel dosyası bulunamadı: ${filePath}`);
  }

  console.log(`Kaynak: ${filePath}`);
  console.log(dryRun ? "Mod: dry-run" : "Mod: import");

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
    skippedInvalid: 0,
    unmatchedVilla: 0,
  };
  const errors: ImportError[] = [];
  const creates: Array<ReturnType<typeof buildCreateData>> = [];
  const updates: Array<{ id: string; data: ReturnType<typeof buildCreateData> }> =
    [];

  function buildCreateData(row: ExcelBookingRow, villaId: string) {
    const guest = resolveGuestFields(row);
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
      createdAt: row.reservationDate ?? row.checkIn!,
      details: {
        importPaymentMethod: row.paymentMethod,
        salesRepName: row.salesRep,
        importSource: format,
      },
    };
  }

  for (const row of parsed.rows) {
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
      errors.push({
        row: row.rowNumber,
        reservationCode: row.reservationCode,
        facilityName: row.facilityName,
        guestName: row.guestName,
        reason: "Villa eşleşmedi",
      });
      continue;
    }

    const data = buildCreateData(row, villa.id);
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
    if (creates.length > 0) {
      await prisma.$transaction(
        creates.map((data) => prisma.booking.create({ data }))
      );
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map(({ id, data }) =>
          prisma.booking.update({
            where: { id },
            data: {
              guestName: data.guestName,
              guestEmail: data.guestEmail,
              guestPhone: data.guestPhone,
              totalPrice: data.totalPrice,
              status: data.status,
              details: data.details,
            },
          })
        )
      );
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
    replaceImported,
    parsedRows: parsed.rows.length,
    stats,
    errors,
    sampleCreates: creates.slice(0, 5),
    sampleUpdates: updates.slice(0, 5).map((item) => ({
      id: item.id,
      externalCode: item.data.externalCode,
      guestName: item.data.guestName,
      guestPhone: item.data.guestPhone,
      guestEmail: item.data.guestEmail,
    })),
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("--- Sonuç ---");
  console.log(`Oluşturulacak/oluşturulan: ${stats.created}`);
  console.log(`Güncellenecek/güncellenen: ${stats.updated}`);
  console.log(`Zaten vardı: ${stats.skippedExisting}`);
  console.log(`Geçersiz satır: ${stats.skippedInvalid}`);
  console.log(`Villa eşleşmeyen: ${stats.unmatchedVilla}`);
  console.log(`Rapor: ${reportPath}`);

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
