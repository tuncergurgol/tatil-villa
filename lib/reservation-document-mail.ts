import type { Attachment } from "nodemailer/lib/mailer";
import { ensureWhatsAppRawConfirmationUrl } from "@/lib/agency-message-render";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import {
  computeNetPrice,
  parseBookingDetails,
  resolveExternalCode,
  type BookingGuestEntry,
  formatGuestFullName,
} from "@/lib/booking-form-details";
import {
  getCompanyPaymentTypeLabel,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import { resolvePaymentMethodLabel } from "@/lib/booking-display";
import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { prepareCompanyLogoForEmail } from "@/lib/email-logo";
import { sendEvolutionTextMessage } from "@/lib/evolution-client";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
  toWhatsAppRecipient,
} from "@/lib/phone";
import { calculateNights } from "@/lib/queries/bookings";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getEvolutionWhatsappAdminData } from "@/lib/queries/evolution-whatsapp";
import {
  applyReservationContractPlaceholders,
  loadOnlineReservationContractBody,
} from "@/lib/reservation-document-contract";
import {
  buildReservationDocumentPdf,
  maskIdentityNumber,
  type ReservationDocumentData,
  type ReservationDocumentGuestRow,
} from "@/lib/reservation-document-pdf";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";

const RESERVATION_DOCUMENT_BCC = "info@tatildeyiz.com.tr";

function guestFullName(guest: BookingGuestEntry): string {
  return formatGuestFullName(guest);
}

function mapGuestRows(
  adults: BookingGuestEntry[],
  children: BookingGuestEntry[],
  babies: BookingGuestEntry[]
): ReservationDocumentGuestRow[] {
  const map = (
    rows: BookingGuestEntry[],
    category: ReservationDocumentGuestRow["category"]
  ) =>
    rows
      .map((guest) => ({
        fullName: guestFullName(guest),
        identityMasked: maskIdentityNumber(guest.nationalId),
        category,
      }))
      .filter((row) => row.fullName);

  return [
    ...map(adults, "adult"),
    ...map(children, "child"),
    ...map(babies, "baby"),
  ];
}

function formatDateRangeLabel(checkIn: Date, checkOut: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return `${fmt(checkIn)} - ${fmt(checkOut)}`;
}

function resolvePrepaymentMethodLabel(
  channel: string | null | undefined,
  detailsPaymentMethod: string | null | undefined
): string {
  const raw =
    channel?.trim() ||
    detailsPaymentMethod?.trim() ||
    "";
  if (!raw) return "—";
  const normalized = normalizeCompanyPaymentType(raw);
  const companyLabel = getCompanyPaymentTypeLabel(normalized);
  if (companyLabel && companyLabel !== normalized) {
    if (normalized === "credit_card") return "Kredi Kartı";
    if (normalized === "bank_transfer") return "Havale / EFT";
    return companyLabel;
  }
  const publicLabel = resolvePaymentMethodLabel(raw);
  if (publicLabel === "Kredi Kartı") return "Kredi Kartı";
  return publicLabel;
}

/**
 * Onaylanmış rezervasyondan PDF veri modeli üretir.
 */
export async function buildReservationDocumentDataForBooking(
  bookingId: string,
  options?: { clientIp?: string; confirmedAt?: Date }
): Promise<ReservationDocumentData> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      villa: {
        select: {
          name: true,
          checkInTime: true,
          checkOutTime: true,
          location: true,
          region: { select: { name: true } },
        },
      },
      prepayments: {
        select: { amount: true, paymentChannel: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!booking) {
    throw new Error("Rezervasyon bulunamadı");
  }

  const details = parseBookingDetails(booking.details);
  const company = await getCompanySettings();
  const contractSource = await loadOnlineReservationContractBody();

  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) ||
    booking.id;
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const primaryIdentity =
    details.guestTc ||
    details.adultGuests?.[0]?.nationalId ||
    "";
  const addressParts = [
    details.guestAddress,
    details.guestDistrict,
    details.guestCity,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  const address = addressParts.join(", ") || "—";

  const periodDiscount =
    details.ownerDiscountAmount ?? details.discountAmount ?? null;
  const otherDiscount = details.agencyDiscountAmount ?? null;
  const netAccommodation = computeNetPrice(details);
  const prepaymentFromRecords = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const prepayment =
    prepaymentFromRecords > 0
      ? prepaymentFromRecords
      : (details.prepaymentAmount ?? 0);
  const reservationTotal =
    booking.totalPrice ??
    netAccommodation ??
    details.grossPrice ??
    null;
  const remainingAtCheckIn =
    details.checkInPayment ??
    (reservationTotal != null
      ? Math.max(0, reservationTotal - prepayment)
      : null);

  const dateRangeLabel = formatDateRangeLabel(
    booking.checkIn,
    booking.checkOut
  );
  const identityMasked = maskIdentityNumber(primaryIdentity);
  const contractBody = applyReservationContractPlaceholders(
    contractSource.body,
    {
      guestName: booking.guestName,
      identityMasked,
      address,
      villaName: booking.villa.name,
      dateRangeLabel,
      reservationCode,
      brandDomain: company.domain || company.brandName,
    }
  );

  const adultGuests = details.adultGuests ?? [];
  const childGuests = details.childGuests ?? [];
  const babyGuests = details.babyGuests ?? [];

  // Tarihler DB date — yerel gün için dateKey üzerinden gösterim
  const checkIn = new Date(`${dbDateToDateKey(booking.checkIn)}T12:00:00`);
  const checkOut = new Date(`${dbDateToDateKey(booking.checkOut)}T12:00:00`);

  return {
    reservationCode,
    issuedAt: new Date(),
    confirmedAt: options?.confirmedAt ?? new Date(),
    clientIp: options?.clientIp,
    guest: {
      fullName: booking.guestName,
      identityMasked,
      phone: booking.guestPhone.replace(/\D/g, "") || booking.guestPhone,
      email: booking.guestEmail,
      address,
    },
    stay: {
      villaName: booking.villa.name,
      regionLabel:
        booking.villa.region?.name || booking.villa.location || "—",
      checkIn,
      checkOut,
      checkInTime: booking.villa.checkInTime || "16:00",
      checkOutTime: booking.villa.checkOutTime || "10:00",
      nights,
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
    },
    guestRows: mapGuestRows(adultGuests, childGuests, babyGuests),
    payments: {
      grossPrice: details.grossPrice ?? booking.totalPrice ?? null,
      periodDiscount:
        periodDiscount != null && periodDiscount > 0 ? periodDiscount : null,
      otherDiscount:
        otherDiscount != null && otherDiscount > 0 ? otherDiscount : null,
      netAccommodation,
      reservationTotal,
      damageDeposit: details.damageDeposit ?? null,
      prepayment: prepayment > 0 ? prepayment : null,
      prepaymentMethodLabel: resolvePrepaymentMethodLabel(
        booking.prepayments[0]?.paymentChannel,
        details.importPaymentMethod || details.paymentMethod || details.prepaymentBank
      ),
      remainingAtCheckIn,
    },
    company: {
      brandName: company.brandName || "tatildeyiz.com.tr",
      agencyName: company.agencyName || "",
      companyTitle: company.companyTitle || "",
      tursabNo: company.tursabNo || "",
      address: company.address || "",
      phone: company.phone || "",
      whatsapp: company.whatsapp || company.phone || "",
      email: company.email || RESERVATION_DOCUMENT_BCC,
    },
    contractBody,
  };
}

function buildGuestMailText(data: ReservationDocumentData): string {
  return `Sayın ${data.guest.fullName},

${data.reservationCode} kodlu rezervasyonunuz konfirme edilmiştir.

Rezervasyon belgeniz (konfirme belgesi ve online rezervasyon sözleşmesi) bu e-postanın ekindedir. Lütfen belgeyi saklayınız.

Tesis: ${data.stay.villaName}
Giriş: ${data.stay.checkIn.toLocaleDateString("tr-TR")} ${data.stay.checkInTime}
Çıkış: ${data.stay.checkOut.toLocaleDateString("tr-TR")} ${data.stay.checkOutTime}

Sorularınız için ${data.company.phone} numaralı telefondan bize ulaşabilirsiniz.

Adres: ${data.company.address}
Telefon: ${data.company.phone} | E-mail: ${data.company.email}`;
}

/** WhatsApp: aynı özet; PDF e-postada (Evolution metin kanalı). */
function buildGuestWhatsAppText(data: ReservationDocumentData): string {
  return `Sayın ${data.guest.fullName},

${data.reservationCode} kodlu rezervasyonunuz konfirme edilmiştir.

Konfirme belgeniz (rezervasyon belgesi + online rezervasyon sözleşmesi) e-posta adresinize PDF olarak gönderilmiştir. Lütfen belgeyi saklayınız.

Tesis: ${data.stay.villaName}
Giriş: ${data.stay.checkIn.toLocaleDateString("tr-TR")} ${data.stay.checkInTime}
Çıkış: ${data.stay.checkOut.toLocaleDateString("tr-TR")} ${data.stay.checkOutTime}

Sorularınız için ${data.company.phone} numaralı telefondan bize ulaşabilirsiniz.

Adres: ${data.company.address}
Telefon: ${data.company.phone}
E-mail: ${data.company.email}`;
}

export type ReservationDocumentChannel = "email" | "whatsapp";

export type ReservationDocumentChannelResult = {
  channel: ReservationDocumentChannel;
  ok: boolean;
  error?: string;
};

/**
 * PDF üretip misafire e-posta + BCC info@ gönderir.
 * Hataları fırlatır (çağıran loglar, success UI'yi bozmaz).
 */
export async function sendReservationDocumentEmail(
  bookingId: string,
  options?: { clientIp?: string; confirmedAt?: Date }
): Promise<{ reservationCode: string; pdfBytes: number }> {
  const data = await buildReservationDocumentDataForBooking(bookingId, options);
  const pdfBuffer = await buildReservationDocumentPdf(data);

  if (!pdfBuffer.length) {
    throw new Error("PDF buffer boş üretildi");
  }

  const email = data.guest.email.trim();
  if (!email || isImportedPlaceholderEmail(email)) {
    throw new Error("Geçerli misafir e-postası yok; belge maili atlandı");
  }

  const company = await getCompanySettings();
  const emailLogo = await prepareCompanyLogoForEmail(
    company.logoUrl,
    company.domain
  );
  const text = buildGuestMailText(data);
  const attachments: Attachment[] = [
    ...(emailLogo.attachments ?? []),
    {
      filename: `rezervasyon-belgesi-${data.reservationCode}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];

  await sendCompanyMail(company, {
    to: email,
    bcc: RESERVATION_DOCUMENT_BCC,
    subject: `${data.reservationCode} nolu rezervasyon belgeniz`,
    text,
    html: toHtmlFromText(text, { logoUrl: emailLogo.src }),
    attachments,
  });

  return {
    reservationCode: data.reservationCode,
    pdfBytes: pdfBuffer.length,
  };
}

/**
 * Misafir onayından sonra konfirme belgesi: e-posta (PDF) + Evolution WhatsApp.
 * Kanal hatalarını fırlatmaz; sonuçları döner (UI success bozulmaz).
 */
export async function sendReservationDocumentNotifications(
  bookingId: string,
  options?: { clientIp?: string; confirmedAt?: Date }
): Promise<{
  reservationCode: string;
  pdfBytes: number;
  results: ReservationDocumentChannelResult[];
}> {
  const data = await buildReservationDocumentDataForBooking(bookingId, options);
  const results: ReservationDocumentChannelResult[] = [];

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildReservationDocumentPdf(data);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "PDF üretilemedi";
    console.error("[sendReservationDocumentNotifications] PDF fail", {
      bookingId,
      error: msg,
    });
    return {
      reservationCode: data.reservationCode,
      pdfBytes: 0,
      results: [
        { channel: "email", ok: false, error: msg },
        {
          channel: "whatsapp",
          ok: false,
          error: `PDF üretilemedi; WA atlandı (${msg})`,
        },
      ],
    };
  }

  if (!pdfBuffer.length) {
    return {
      reservationCode: data.reservationCode,
      pdfBytes: 0,
      results: [
        { channel: "email", ok: false, error: "PDF buffer boş üretildi" },
        { channel: "whatsapp", ok: false, error: "PDF üretilemedi; WA atlandı" },
      ],
    };
  }

  const company = await getCompanySettings();
  const email = data.guest.email.trim();
  const phoneRaw = data.guest.phone.trim() || "";

  // --- E-posta (PDF ek + BCC) ---
  if (!email || isImportedPlaceholderEmail(email)) {
    results.push({
      channel: "email",
      ok: false,
      error: "Geçerli misafir e-postası yok",
    });
  } else {
    try {
      const emailLogo = await prepareCompanyLogoForEmail(
        company.logoUrl,
        company.domain
      );
      const text = buildGuestMailText(data);
      const attachments: Attachment[] = [
        ...(emailLogo.attachments ?? []),
        {
          filename: `rezervasyon-belgesi-${data.reservationCode}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];

      await sendCompanyMail(company, {
        to: email,
        bcc: RESERVATION_DOCUMENT_BCC,
        subject: `${data.reservationCode} nolu rezervasyon belgeniz`,
        text,
        html: toHtmlFromText(text, { logoUrl: emailLogo.src }),
        attachments,
      });
      results.push({ channel: "email", ok: true });
    } catch (error) {
      results.push({
        channel: "email",
        ok: false,
        error: error instanceof Error ? error.message : "E-posta gönderilemedi",
      });
    }
  }

  // --- WhatsApp (Evolution, düz metin) — booking-confirmation-send ile aynı kanal ---
  const e164 = phoneRaw ? normalizePhoneToE164(phoneRaw) : "";
  if (!e164 || !isValidTurkishMobileE164(e164)) {
    results.push({
      channel: "whatsapp",
      ok: false,
      error: phoneRaw
        ? "Geçersiz telefon numarası"
        : "Misafir telefonu yok",
    });
  } else {
    try {
      const evolution = await getEvolutionWhatsappAdminData();
      if (!evolution.evolutionApiKey || !evolution.evolutionBaseUrl) {
        results.push({
          channel: "whatsapp",
          ok: false,
          error: "Sistem WhatsApp (Evolution) ayarları eksik",
        });
      } else {
        const whatsappMessage = ensureWhatsAppRawConfirmationUrl(
          buildGuestWhatsAppText(data)
        );
        await sendEvolutionTextMessage(
          evolution.evolutionBaseUrl,
          evolution.evolutionApiKey,
          evolution.evolutionInstanceName,
          toWhatsAppRecipient(e164),
          whatsappMessage
        );
        results.push({ channel: "whatsapp", ok: true });
      }
    } catch (error) {
      results.push({
        channel: "whatsapp",
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "WhatsApp mesajı gönderilemedi",
      });
    }
  }

  return {
    reservationCode: data.reservationCode,
    pdfBytes: pdfBuffer.length,
    results,
  };
}

