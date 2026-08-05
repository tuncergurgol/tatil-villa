"use server";

import { BookingStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  buildActivityLogEntry,
  normalizeActivityLogs,
  appendBookingActivityLog,
} from "@/lib/booking-activity-log";
import {
  formatGuestFullName,
  parseBookingDetails,
  type BookingGuestEntry,
} from "@/lib/booking-form-details";
import { prisma } from "@/lib/db";
import { getBookingForPublicConfirmation } from "@/lib/queries/booking-confirmation";
import { isTcKimlikAcceptable } from "@/lib/tc-kimlik";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import { handleBookingConfirmedTransition } from "@/lib/booking-excel-export";
import { notifyBookingConfirmedByGuest } from "@/lib/booking-confirmed-notify";
import { sendReservationDocumentNotifications } from "@/lib/reservation-document-mail";
import { getRequestClientIp } from "@/lib/request-client-ip";
import {
  getPrepaymentShareChannelLabel,
  type PrepaymentShareChannel,
} from "@/lib/booking-prepayment-share";

const guestSchema = z.object({
  name: z.string().trim().min(2, "Ad gerekli"),
  surname: z.string().trim().min(2, "Soyad gerekli"),
  /** Yalnızca 1. kişi (rezervasyon sahibi) için zorunlu */
  nationality: z.string().trim().optional().default(""),
  identityNumber: z.string().trim().optional().default(""),
});

const confirmSchema = z.object({
  rezId: z.string().trim().min(1),
  mail: z.string().trim().optional(),
  invoiceType: z.enum(["individual", "corporate"]),
  useDifferentInvoice: z.boolean().default(false),
  country: z.string().trim().min(1, "Ülke seçimi gerekli"),
  address: z.string().trim().min(3, "Adres gerekli"),
  city: z.string().trim().min(1, "İl seçimi gerekli"),
  district: z.string().trim().min(1, "İlçe seçimi gerekli"),
  companyName: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  taxOffice: z.string().trim().optional(),
  companyAddress: z.string().trim().optional(),
  invoiceFirstName: z.string().trim().optional(),
  invoiceLastName: z.string().trim().optional(),
  invoiceIdentityNumber: z.string().trim().optional(),
  invoiceAddress: z.string().trim().optional(),
  guests: z.array(guestSchema).min(1),
});

export type ConfirmBookingGuestInfoResult =
  | { success: true }
  | { success: false; error: string };

function validateGuestIdentity(
  guest: z.infer<typeof guestSchema>,
  index: number
): string | null {
  // Ek misafirlerde TC / uyruk istenmez
  if (index > 0) return null;

  const label = "Rezervasyon sahibi";
  const nationality = guest.nationality.trim();
  if (!nationality) {
    return `${label} için uyruğu seçimi gerekli.`;
  }

  const id = guest.identityNumber.trim();
  const isTc = nationality === "TC";

  if (!id) {
    return isTc
      ? `${label} için TC kimlik numarası gerekli.`
      : `${label} için kimlik / pasaport numarası gerekli.`;
  }

  if (isTc && !isTcKimlikAcceptable(id, true)) {
    return `${label}: geçerli bir TC kimlik numarası giriniz.`;
  }
  return null;
}

function toGuestEntry(
  guest: z.infer<typeof guestSchema>,
  index: number
): BookingGuestEntry {
  const name = guest.name.trim();
  const surname = guest.surname.trim();
  const isPrimary = index === 0;
  return {
    // Admin tabloda tek "ad" alanında tam ad görünsün
    name: formatGuestFullName({ name, surname }),
    surname,
    nationalId: isPrimary ? guest.identityNumber.trim() : "",
    plate: "",
    gender: "",
    nationality: isPrimary ? guest.nationality.trim() || "TC" : "",
  };
}

export async function confirmBookingGuestInfoAction(
  raw: unknown
): Promise<ConfirmBookingGuestInfoResult> {
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const data = parsed.data;

  if (!data.country.trim()) {
    return { success: false, error: "Ülke seçimi gerekli." };
  }
  if (!data.city.trim()) {
    return { success: false, error: "İl seçimi gerekli." };
  }
  if (!data.district.trim()) {
    return { success: false, error: "İlçe seçimi gerekli." };
  }
  if (!data.address.trim() || data.address.trim().length < 3) {
    return { success: false, error: "Adres bilgisi gerekli." };
  }

  for (const [index, guest] of data.guests.entries()) {
    const identityError = validateGuestIdentity(guest, index);
    if (identityError) return { success: false, error: identityError };
  }

  if (data.invoiceType === "corporate") {
    if (!data.companyName?.trim()) {
      return { success: false, error: "Şirket ünvanı gerekli." };
    }
    if (!/^[0-9]{10}$/.test(data.taxNumber?.trim() ?? "")) {
      return { success: false, error: "10 haneli geçerli bir vergi numarası giriniz." };
    }
    if (!data.taxOffice?.trim()) {
      return { success: false, error: "Vergi dairesi gerekli." };
    }
    if (!data.companyAddress?.trim()) {
      return { success: false, error: "Şirket adresi gerekli." };
    }
  }

  if (data.invoiceType === "individual" && data.useDifferentInvoice) {
    if (!data.invoiceFirstName?.trim() || !data.invoiceLastName?.trim()) {
      return { success: false, error: "Fatura ad soyad gerekli." };
    }
    const invoiceId = data.invoiceIdentityNumber?.trim() ?? "";
    if (!isTcKimlikAcceptable(invoiceId, true)) {
      return { success: false, error: "Fatura TC kimlik numarası geçersiz." };
    }
    if (!data.invoiceAddress?.trim()) {
      return { success: false, error: "Fatura adresi gerekli." };
    }
  }

  const lookup = await getBookingForPublicConfirmation({
    rezId: data.rezId,
    mail: data.mail,
  });
  if (!lookup.ok) {
    return { success: false, error: lookup.error };
  }

  const booking = lookup.booking;
  if (booking.alreadyConfirmed) {
    return { success: false, error: "Bu rezervasyon zaten onaylanmış." };
  }

  if (
    booking.status !== BookingStatus.CONFIRMATION_SENT &&
    booking.status !== BookingStatus.PREPAYMENT &&
    booking.status !== BookingStatus.NEW
  ) {
    return {
      success: false,
      error: "Bu rezervasyon şu an onay formuna açık değil.",
    };
  }

  if (data.guests.length !== booking.totalGuests) {
    return {
      success: false,
      error: `Toplam ${booking.totalGuests} misafir bilgisi girilmelidir.`,
    };
  }

  const guestEntries = data.guests.map(toGuestEntry);
  const adultCount = Math.max(1, booking.adults);
  const childCount = Math.max(0, booking.children);
  const babyCount = Math.max(0, booking.babies);
  const adultGuests = guestEntries.slice(0, adultCount);
  const childGuests = guestEntries.slice(
    adultCount,
    adultCount + childCount
  );
  const babyGuests = guestEntries.slice(
    adultCount + childCount,
    adultCount + childCount + babyCount
  );

  const primary = guestEntries[0]!;
  // toGuestEntry name alanına zaten ad+soyad yazar; tekrar soyad ekleme
  const guestName = formatGuestFullName(primary);
  const clientIp = await getRequestClientIp();

  const existingDetails = parseBookingDetails(
    (
      await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { details: true },
      })
    )?.details
  );

  const isCorporate = data.invoiceType === "corporate";
  const useDiff =
    data.invoiceType === "individual" && data.useDifferentInvoice;

  const nextDetails = {
    ...existingDetails,
    adultGuests,
    childGuests,
    babyGuests,
    guestTc: primary.nationalId,
    guestAddress: data.address.trim(),
    guestCity: data.city.trim(),
    guestDistrict: data.district.trim(),
    guestCountry: data.country.trim(),
    wantsTaxpayerInfo: isCorporate || useDiff ? "yes" : "no",
    taxpayerType: isCorporate ? "corporate" : "individual",
    invoiceTitle: isCorporate
      ? data.companyName!.trim()
      : useDiff
        ? `${data.invoiceFirstName!.trim()} ${data.invoiceLastName!.trim()}`
        : guestName,
    invoiceTaxNumber: isCorporate
      ? data.taxNumber!.trim()
      : useDiff
        ? data.invoiceIdentityNumber!.trim()
        : primary.nationalId,
    invoiceTaxOffice: isCorporate ? data.taxOffice!.trim() : "",
    invoiceAddress: isCorporate
      ? data.companyAddress!.trim()
      : useDiff
        ? data.invoiceAddress!.trim()
        : data.address.trim(),
    invoiceCountry: data.country.trim(),
    invoiceCity: data.city.trim(),
    invoiceDistrict: data.district.trim(),
  };

  const guestLog = buildActivityLogEntry({
    action: "guest_confirmed",
    message: "Misafir bilgileri girildi ve rezervasyon onaylandı",
    actorName: guestName || "Misafir",
    meta: {
      rezId: booking.rezId,
      ...(clientIp ? { ip: clientIp } : {}),
    },
  });
  const statusLog = buildActivityLogEntry({
    action: "status_changed",
    message: "Durum: Onaylandı (misafir onayı)",
    actorName: guestName || "Misafir",
    meta: {
      from: booking.status,
      to: BookingStatus.CONFIRMED,
      ...(clientIp ? { ip: clientIp } : {}),
    },
  });

  const activityLogs = normalizeActivityLogs([
    ...normalizeActivityLogs(nextDetails.activityLogs),
    guestLog,
    statusLog,
  ]);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      guestName,
      status: BookingStatus.CONFIRMED,
      details: {
        ...nextDetails,
        activityLogs,
      } as Prisma.InputJsonValue,
    },
    select: { villaId: true, checkIn: true, checkOut: true },
  });

  // Onaylı rezervasyon: konaklama gecelerini takvimde BOOKED yap
  // (check-in dahil, check-out hariç — mevcut doluluk kuralı)
  await applyVillaPeriodDaysOccupancy(
    updated.villaId,
    dbDateToDateKey(updated.checkIn),
    dbDateToDateKey(updated.checkOut),
    "BOOKED",
    "stay"
  );

  await handleBookingConfirmedTransition(booking.id, booking.status);

  try {
    await notifyBookingConfirmedByGuest(booking.id);
  } catch (error) {
    console.error(
      "[confirmBookingGuestInfo] yönetim bildirimi gönderilemedi",
      {
        bookingId: booking.id,
        rezId: booking.rezId,
        error: error instanceof Error ? error.message : error,
      }
    );
  }

  // Konfirme belgesi (PDF mail + Evolution WA) hata verse bile onay success
  try {
    const delivery = await sendReservationDocumentNotifications(booking.id, {
      confirmedAt: new Date(),
      clientIp: clientIp ?? undefined,
    });

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
      message = `Konfirme belgesi gönderildi (${okChannels.join(", ")})`;
    } else if (okChannels.length) {
      message = `Konfirme belgesi kısmen gönderildi (${okChannels.join(", ")}). Başarısız: ${failParts.join("; ")}`;
    } else {
      message = `Konfirme belgesi gönderilemedi: ${failParts.join("; ") || "bilinmeyen hata"}`;
    }

    await appendBookingActivityLog(booking.id, {
      action: "reservation_document_sent",
      message,
      actorName: "Sistem",
      meta: {
        rezId: booking.rezId,
        reservationCode: delivery.reservationCode,
        emailOk: delivery.results.find((r) => r.channel === "email")?.ok ?? false,
        whatsappOk:
          delivery.results.find((r) => r.channel === "whatsapp")?.ok ?? false,
        emailError:
          delivery.results.find((r) => r.channel === "email" && !r.ok)?.error ??
          null,
        whatsappError:
          delivery.results.find((r) => r.channel === "whatsapp" && !r.ok)
            ?.error ?? null,
        pdfBytes: delivery.pdfBytes,
      },
    });

    for (const result of delivery.results) {
      if (!result.ok) {
        console.error(
          "[confirmBookingGuestInfo] konfirme belgesi kanal hatası",
          {
            bookingId: booking.id,
            rezId: booking.rezId,
            channel: result.channel,
            error: result.error,
          }
        );
      }
    }
  } catch (error) {
    console.error(
      "[confirmBookingGuestInfo] konfirme belgesi gönderilemedi",
      {
        bookingId: booking.id,
        rezId: booking.rezId,
        error: error instanceof Error ? error.message : error,
      }
    );
    try {
      await appendBookingActivityLog(booking.id, {
        action: "reservation_document_sent",
        message: `Konfirme belgesi gönderilemedi: ${
          error instanceof Error ? error.message : "bilinmeyen hata"
        }`,
        actorName: "Sistem",
        meta: { rezId: booking.rezId },
      });
    } catch (logError) {
      console.error(
        "[confirmBookingGuestInfo] activity log yazılamadı",
        logError
      );
    }
  }

  return { success: true };
}
