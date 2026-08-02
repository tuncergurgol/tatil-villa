/**
 * Excel export yardımcıları smoke testi.
 *
 *   npx tsx scripts/smoke-booking-excel-export.ts
 */
import { buildBookingExcelRowValues } from "../lib/booking-excel-export";
import { BookingStatus, StayStatus } from "@prisma/client";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const row = buildBookingExcelRowValues({
    externalCode: 115999,
    createdAt: new Date("2026-07-20T00:00:00.000Z"),
    guestName: "Test Misafir",
    checkIn: new Date("2026-08-10T00:00:00.000Z"),
    checkOut: new Date("2026-08-15T00:00:00.000Z"),
    adults: 2,
    children: 0,
    facilityName: "Villa Test",
    totalPrice: 32000,
    status: BookingStatus.CONFIRMED,
    stayStatus: StayStatus.BEKLENIYOR,
    details: {
      prepaymentAmount: 11200,
      checkInPayment: 20800,
      cleaningFee: 4500,
      invoiceAmount: 6400,
      importPaymentMethod: "Kredi Kartı",
      agencyName: "Tatil Villacısı",
      salesRepName: "Nejla Gürgöl",
      commissionRate: 20,
    },
    ownerAccountingCode: "320.01.209",
    ownerName: "Test Sahip",
    salesType: "komisyon",
  });

  assert(row[0] === 115999, "externalCode");
  assert(row[2] === "Test Misafir", "guestName");
  assert(row[5] === 5, "nights");
  assert(row[10] === 32000, "totalPrice");
  assert(row[19] === "Onayladı", "status label");
  assert(row[20] === "Bekleniyor", "stay status label");
  assert(row.length === 26, "26 columns");

  console.log("smoke-booking-excel-export: OK");
}

main();
