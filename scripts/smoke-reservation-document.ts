/**
 * Local smoke: PDF üret + 116003 için mail/WA yeniden gönder (activity log yazar).
 * Usage: npx tsx scripts/smoke-reservation-document.ts
 */
import { appendBookingActivityLog } from "../lib/booking-activity-log";
import {
  getPrepaymentShareChannelLabel,
  type PrepaymentShareChannel,
} from "../lib/booking-prepayment-share";
import { prisma } from "../lib/db";
import {
  buildReservationDocumentDataForBooking,
  sendReservationDocumentNotifications,
} from "../lib/reservation-document-mail";
import {
  buildReservationDocumentPdf,
  buildSampleReservationDocumentData,
} from "../lib/reservation-document-pdf";

async function smokePdfOnly() {
  const buf = await buildReservationDocumentPdf(
    buildSampleReservationDocumentData()
  );
  console.log("[smoke] sample PDF bytes:", buf.length);
  if (!buf.length || buf.subarray(0, 4).toString() !== "%PDF") {
    throw new Error("PDF magic header yok");
  }
}

async function smokeBooking116003(send: boolean) {
  const booking = await prisma.booking.findFirst({
    where: { externalCode: 116003 },
    select: { id: true, externalCode: true, guestEmail: true, guestPhone: true },
  });
  if (!booking) throw new Error("116003 bulunamadı");

  const data = await buildReservationDocumentDataForBooking(booking.id);
  console.log("[smoke] guest", {
    email: data.guest.email,
    phone: data.guest.phone,
    code: data.reservationCode,
  });

  const pdf = await buildReservationDocumentPdf(data);
  console.log("[smoke] booking PDF bytes:", pdf.length);

  if (!send) {
    console.log("[smoke] --send yok; bildirim atlandı");
    return;
  }

  const delivery = await sendReservationDocumentNotifications(booking.id, {
    confirmedAt: new Date(),
  });
  console.log("[smoke] delivery", JSON.stringify(delivery, null, 2));

  const okChannels = delivery.results
    .filter((r) => r.ok)
    .map((r) =>
      getPrepaymentShareChannelLabel(r.channel as PrepaymentShareChannel)
    );
  const failParts = delivery.results
    .filter((r) => !r.ok)
    .map(
      (r) =>
        `${getPrepaymentShareChannelLabel(r.channel as PrepaymentShareChannel)}: ${r.error ?? "hata"}`
    );

  let message: string;
  if (okChannels.length && failParts.length === 0) {
    message = `Konfirme belgesi gönderildi (${okChannels.join(", ")}) [smoke]`;
  } else if (okChannels.length) {
    message = `Konfirme belgesi kısmen gönderildi (${okChannels.join(", ")}). Başarısız: ${failParts.join("; ")} [smoke]`;
  } else {
    message = `Konfirme belgesi gönderilemedi: ${failParts.join("; ") || "bilinmeyen hata"} [smoke]`;
  }

  await appendBookingActivityLog(booking.id, {
    action: "reservation_document_sent",
    message,
    actorName: "Sistem",
    meta: {
      rezId: String(booking.externalCode ?? booking.id),
      reservationCode: delivery.reservationCode,
      emailOk: delivery.results.find((r) => r.channel === "email")?.ok ?? false,
      whatsappOk:
        delivery.results.find((r) => r.channel === "whatsapp")?.ok ?? false,
      emailError:
        delivery.results.find((r) => r.channel === "email" && !r.ok)?.error ??
        null,
      whatsappError:
        delivery.results.find((r) => r.channel === "whatsapp" && !r.ok)?.error ??
        null,
      pdfBytes: delivery.pdfBytes,
      smoke: true,
    },
  });
  console.log("[smoke] activity:", message);
}

async function main() {
  const send = process.argv.includes("--send");
  await smokePdfOnly();
  await smokeBooking116003(send);
}

main()
  .catch((e) => {
    console.error("[smoke] FAIL", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
