/**
 * Rezervasyon belgesi PDF — buffer length smoke (dosyaya yazmaz).
 * Çalıştır: npx tsx scripts/smoke-reservation-document-pdf.ts
 */
import {
  buildReservationDocumentPdf,
  buildSampleReservationDocumentData,
  maskIdentityNumber,
} from "../lib/reservation-document-pdf";
import {
  applyReservationContractPlaceholders,
  FALLBACK_ONLINE_RESERVATION_CONTRACT,
} from "../lib/reservation-document-contract";
import { resolveBookingConfirmedAtFromLogs } from "../lib/booking-activity-log-core";

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`ok — ${label}`);
}

async function main() {
  assert(maskIdentityNumber("12345678901") === "*******8901", "TC maskeleme");
  assert(maskIdentityNumber("AB12") === "****", "kısa kimlik maskeleme");

  const personalized = applyReservationContractPlaceholders(
    FALLBACK_ONLINE_RESERVATION_CONTRACT,
    {
      guestName: "Emre YANARDAĞ",
      identityMasked: "*******0638",
      address: "Test Adres",
      villaName: "Bungalov Masal",
      dateRangeLabel: "24 Haziran 2026 - 27 Haziran 2026",
      reservationCode: "116004",
      brandDomain: "www.tatilvillacisi.com",
    }
  );
  assert(
    personalized.includes("Emre YANARDAĞ") &&
      personalized.includes("Bungalov Masal") &&
      personalized.includes("116004"),
    "sözleşme placeholder değişimi"
  );
  assert(
    personalized.includes("www.tatilvillacisi.com") &&
      !personalized.includes("www.tatildeyiz.com.tr"),
    "sözleşme site domain değişimi"
  );

  const confirmedAt = resolveBookingConfirmedAtFromLogs(
    [
      {
        id: "status-1",
        at: "2026-06-01T06:33:04.000Z",
        action: "status_changed",
        message: "Durum: Onaylandı",
        actorName: "Sistem",
        meta: { to: "CONFIRMED" },
      },
    ],
    null
  );
  assert(
    confirmedAt?.toISOString() === "2026-06-01T06:33:04.000Z",
    "onay tarihi activity log"
  );

  const data = buildSampleReservationDocumentData();
  const buffer = await buildReservationDocumentPdf(data);

  assert(buffer.length > 2000, `PDF buffer uzunluğu (${buffer.length})`);
  assert(buffer.subarray(0, 4).toString() === "%PDF", "PDF magic bytes");

  console.log(`smoke ok — reservation PDF ${buffer.length} bytes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
