"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  cleanupAgencyMessageRenderedText,
  formatAgencyBookingDate,
  renderAgencyMessageTemplate,
} from "@/lib/agency-message-render";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_30_2,
  formatAgencyMessageRowNo,
} from "@/lib/agency-message-row-no";
import {
  OPTION_REQUEST_SMS_BODY,
  OPTION_REQUEST_WHATSAPP_BODY,
} from "@/lib/agency-message-templates/option-request";
import {
  appendBookingActivityLog,
  resolveActivityActor,
  type BookingActivityLogEntry,
} from "@/lib/booking-activity-log";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { resolveBookingSiteBrand } from "@/lib/booking-site-brand";
import { prisma } from "@/lib/db";
import { calculateNights } from "@/lib/stay-nights";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getAgencyMessageTemplateByRowNo } from "@/lib/queries/agency-message-templates";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { sendOperationsWhatsApp } from "@/lib/whatsapp-delivery";

const inputSchema = z.object({
  bookingId: z.string().min(1),
});

export type SendOptionRequestMessageResult =
  | {
      success: true;
      message: string;
      activityLogs: BookingActivityLogEntry[];
    }
  | { success: false; error: string };

function setAlias(
  values: Record<string, string>,
  aliases: string[],
  value: string
) {
  for (const alias of aliases) {
    values[alias] = value;
  }
}

function pickOptionRequestBody(template: {
  smsBody: string;
  whatsappBody: string;
  mailBody: string;
} | null): string {
  if (!template) return OPTION_REQUEST_WHATSAPP_BODY;
  return (
    template.whatsappBody ||
    template.smsBody ||
    template.mailBody ||
    OPTION_REQUEST_WHATSAPP_BODY ||
    OPTION_REQUEST_SMS_BODY
  );
}

/**
 * Ön ödeme paylaş modalı — Mesaj İçeriği 30.2 (Opsiyon İste).
 * Alıcı: villanın takvim yöneteni (calendarManagerPhone) → Evolution / Takvim WA.
 */
export async function sendOptionRequestMessageAction(
  payload: z.infer<typeof inputSchema>
): Promise<SendOptionRequestMessageResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);

  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Geçersiz istek" };
  }

  const { bookingId } = parsed.data;
  const [booking, template, company, agencySites] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        details: true,
        villa: {
          select: {
            name: true,
            originalName: true,
            calendarManagerName: true,
            calendarManagerPhone: true,
          },
        },
      },
    }),
    getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_30_2),
    getCompanySettings(),
    getAgencySitesForPicker(),
  ]);

  if (!booking) {
    return { success: false, error: "Rezervasyon bulunamadı" };
  }

  if (!template) {
    return {
      success: false,
      error: `Mesaj şablonu bulunamadı (${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_30_2)})`,
    };
  }

  const phone = booking.villa.calendarManagerPhone.trim();
  if (!phone) {
    return {
      success: false,
      error:
        "Takvim yöneteni telefonu tanımlı değil. Villa → Personel sekmesinden ekleyin.",
    };
  }

  const details = parseBookingDetails(booking.details);
  const siteBrand = resolveBookingSiteBrand({
    siteInfo: details.siteInfo,
    originDomain: details.originDomain,
    company: {
      brandName: company.brandName,
      domain: company.domain,
      logoUrl: company.logoUrl,
    },
    agencySites,
  });

  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const managerName =
    booking.villa.calendarManagerName.trim() || "Takvim Yetkilisi";
  const villaName = booking.villa.name.trim();
  const originalName = (booking.villa.originalName || "").trim();
  const firmName =
    siteBrand.siteInfo.trim() ||
    company.brandName.trim() ||
    company.agencyName.trim() ||
    "Tatildeyiz";
  const checkInLabel = formatAgencyBookingDate(booking.checkIn);
  const checkOutLabel = formatAgencyBookingDate(booking.checkOut);

  const values: Record<string, string> = {};
  setAlias(
    values,
    [
      "KARŞILAYAN",
      "KARSILAYAN",
      "KARSILAYANADI",
      "YETKILIADI",
      "YETKİLİADI",
      "ALICIADI",
      "HITAPADI",
    ],
    managerName
  );
  setAlias(
    values,
    ["TESISADI", "TESİSADI", "VILLAADI", "VİLLAADI", "VVILLAADI"],
    villaName
  );
  setAlias(
    values,
    [
      "TESISORJINALADI",
      "TESİSORJİNALADI",
      "TESISORJINALADISADE",
      "TESİSORJİNALADISADE",
      "VILLAORJINALADI",
      "ORJINALADI",
    ],
    originalName
  );
  setAlias(
    values,
    ["GIRIS", "GİRİŞ", "GIRISTARIHI", "GİRİŞTARİHİ", "TARIH1"],
    checkInLabel
  );
  setAlias(
    values,
    ["CIKIS", "ÇIKIŞ", "CIKISTARIHI", "ÇIKIŞTARİHİ", "TARIH2"],
    checkOutLabel
  );
  setAlias(values, ["GECE", "GECESAYISI", "GUNSAYISI"], String(nights));
  setAlias(
    values,
    ["FIRMAADI", "FİRMAADI", "SITEADI", "SİTEADI"],
    firmName
  );

  const body = pickOptionRequestBody(template);
  const message = cleanupAgencyMessageRenderedText(
    renderAgencyMessageTemplate(body, values)
  );

  if (!message.trim()) {
    return { success: false, error: "Gönderilecek mesaj metni boş" };
  }

  const wa = await sendOperationsWhatsApp(phone, message);
  if (!wa.ok) {
    return {
      success: false,
      error: wa.error || "Opsiyon iste mesajı gönderilemedi",
    };
  }

  const activityLogs = await appendBookingActivityLog(bookingId, {
    action: "option_request_message_sent",
    message: `Opsiyon iste mesajı gönderildi (${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_30_2)} → ${managerName})`,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    meta: {
      templateRowNo: AGENCY_MESSAGE_TEMPLATE_ROW_30_2,
      channel: "whatsapp",
      recipientRole: "calendar_manager",
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  return {
    success: true,
    message: `Opsiyon iste mesajı ${managerName} kişisine WhatsApp ile gönderildi.`,
    activityLogs,
  };
}
