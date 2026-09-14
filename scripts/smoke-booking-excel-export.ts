/**
 * Excel export yardımcıları smoke testi.
 *
 *   npx tsx scripts/smoke-booking-excel-export.ts
 */
import {
  buildBookingExcelRowValues,
  BOOKING_EXCEL_COLUMN_COUNT,
} from "../lib/booking-excel-rows";
import { BookingStatus, StayStatus } from "@prisma/client";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const row = buildBookingExcelRowValues({
    externalCode: 115999,
    createdAt: new Date("2026-07-20T00:00:00.000Z"),
    guestName: "Test Misafir",
    guestPhone: "+905321112233",
    guestEmail: "test@example.com",
    checkIn: new Date("2026-08-10T00:00:00.000Z"),
    checkOut: new Date("2026-08-15T00:00:00.000Z"),
    adults: 2,
    children: 0,
    facilityName: "Villa Test",
    totalPrice: 32000,
    status: BookingStatus.CONFIRMED,
    stayStatus: StayStatus.BEKLENIYOR,
    details: {
      siteInfo: "Tatil Villacısı",
      prepaymentAmount: 11200,
      checkInPayment: 20800,
      cleaningFee: 4500,
      invoiceAmount: 6400,
      importPaymentMethod: "Kredi Kartı",
      agencyName: "Tatil Villacısı",
      salesRepName: "Nejla Gürgöl",
      commissionRate: 20,
      guestTc: "12345678901",
      adultGuests: [
        {
          name: "Test",
          surname: "Misafir",
          nationalId: "12345678901",
          plate: "",
          nationality: "TC",
        },
      ],
    },
    ownerAccountingCode: "320.01.209",
    ownerName: "Test Sahip",
    salesType: "komisyon",
    kbsReportable: false,
  });

  assert(row[0] === 115999, "externalCode");
  assert(row[1] === "Tatil Villacısı", "site name");
  assert(row[3] === "Test Misafir", "guestName");
  assert(row[6] === 5, "nights");
  assert(row[11] === 32000, "totalPrice");
  assert(row[20] === "Onayladı", "status label");
  assert(row[21] === "Bekleniyor", "stay status label");
  assert(row[27] === 6400, "commission amount");
  assert(row[28] === 4800, "owner payable");
  assert(row[46] === "HAYIR", "kbs");
  assert(row[48] === "+905321112233", "phone");
  assert(row[49] === "test@example.com", "email");
  assert(row[51] === "12345678901", "national id");
  assert(row.length === BOOKING_EXCEL_COLUMN_COUNT, "full column count");

  console.log("smoke-booking-excel-export: OK");
}

main();
