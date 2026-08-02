/**
 * Excel rezervasyon import yardımcıları smoke testi.
 *
 *   npx tsx scripts/smoke-booking-excel-import.ts
 */
import {
  BOOKING_EXCEL_COLUMN_MAP,
  isConfirmedExcelReservationStatus,
  mapReservationStatus,
  mapStayStatus,
} from "../lib/booking-excel-import";
import { BookingStatus, StayStatus } from "@prisma/client";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  assert(BOOKING_EXCEL_COLUMN_MAP.length === 53, "53 sütun eşlemesi bekleniyor");
  assert(
    isConfirmedExcelReservationStatus("Onayladı"),
    "Onayladı onaylı sayılmalı"
  );
  assert(
    !isConfirmedExcelReservationStatus("İptal"),
    "İptal onaylı sayılmamalı"
  );
  assert(
    mapReservationStatus("Onayladı") === BookingStatus.CONFIRMED,
    "Onayladı -> CONFIRMED"
  );
  assert(mapStayStatus("Yapıldı") === StayStatus.YAPILDI, "Yapıldı -> YAPILDI");
  assert(
    mapStayStatus("Bekleniyor") === StayStatus.BEKLENIYOR,
    "Bekleniyor -> BEKLENIYOR"
  );

  console.log("smoke-booking-excel-import: OK");
}

main();
