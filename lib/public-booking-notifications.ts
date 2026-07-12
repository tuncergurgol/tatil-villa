import {
  buildNewReservationRequestTemplateValues,
  renderAgencyMessageTemplate,
  resolveCompanyLogoUrl,
} from "@/lib/agency-message-render";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_1,
  AGENCY_MESSAGE_TEMPLATE_ROW_2,
} from "@/lib/agency-message-row-no";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { sendCompanyMail } from "@/lib/email";
import { sendEvolutionTextMessage } from "@/lib/evolution-client";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
  toWhatsAppRecipient,
} from "@/lib/phone";
import { getAgencyMessageTemplateByRowNo } from "@/lib/queries/agency-message-templates";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getEvolutionWhatsappAdminData } from "@/lib/queries/evolution-whatsapp";

const ADMIN_NOTIFY_EMAIL = "info@tatildeyiz.com.tr";

type NewReservationBooking = {
  id: string;
  externalCode: number | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  totalPrice: number | null;
  details: unknown;
  villa: {
    name: string;
    checkInTime: string;
    checkOutTime: string;
    region?: { name: string } | null;
  };
};

function pickChannelBody(
  template: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  },
  channel: "sms" | "whatsapp" | "email"
) {
  if (channel === "sms") {
    return template.smsBody || template.whatsappBody || template.mailBody;
  }
  if (channel === "whatsapp") {
    return template.whatsappBody || template.smsBody || template.mailBody;
  }
  return template.mailBody || template.whatsappBody || template.smsBody;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toHtmlFromText(text: string, logoUrl?: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const bodyHtml = lines
    .map((line) => {
      const trimmed = line.trim();
      const escaped = escapeHtml(line);
      if (
        /^Adres\s*:/i.test(trimmed) ||
        /^Telefon\s*:/i.test(trimmed)
      ) {
        return `<div style="text-align:center;margin:4px 0;">${escaped}</div>`;
      }
      if (!trimmed) return "<br/>";
      return `${escaped}<br/>`;
    })
    .join("");

  const logo =
    logoUrl?.trim()
      ? `<p style="text-align:center;margin:0 0 16px;"><img src="${escapeHtml(logoUrl.trim())}" alt="Logo" style="max-width:180px;height:auto;" /></p>`
      : "";

  return `${logo}<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">${bodyHtml}</div>`;
}

async function sendGuestWhatsApp(phone: string, message: string) {
  const e164 = normalizePhoneToE164(phone);
  if (!e164 || !isValidTurkishMobileE164(e164)) {
    console.warn("[new-reservation-notify] WhatsApp: geçersiz telefon", phone);
    return false;
  }

  const evolution = await getEvolutionWhatsappAdminData();
  if (!evolution.evolutionApiKey || !evolution.evolutionBaseUrl) {
    console.warn(
      "[new-reservation-notify] WhatsApp: Evolution ayarları eksik, mesaj gönderilemedi"
    );
    return false;
  }

  await sendEvolutionTextMessage(
    evolution.evolutionBaseUrl,
    evolution.evolutionApiKey,
    evolution.evolutionInstanceName,
    toWhatsAppRecipient(e164),
    message
  );
  return true;
}

async function sendGuestSms(phone: string, message: string, bookingId: string) {
  // SMS sağlayıcısı henüz bağlı değil; kanal hazır, log ile izlenir.
  console.info("[new-reservation-notify] SMS (provider yok — log)", {
    bookingId,
    phone,
    message,
  });
  return false;
}

/**
 * Yeni rezervasyon talebi sonrası:
 * - Mesaj İçeriği 1 → misafire SMS + WhatsApp + Mail
 * - Mesaj İçeriği 2 → info@tatildeyiz.com.tr Mail
 *
 * Bildirim hataları rezervasyonu bozmaz.
 */
export async function notifyNewReservationRequest(
  booking: NewReservationBooking
): Promise<void> {
  try {
    const [company, guestTemplate, adminTemplate] = await Promise.all([
      getCompanySettings(),
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_1),
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_2),
    ]);

    const details = parseBookingDetails(booking.details);
    const reservationCode =
      booking.externalCode != null ? String(booking.externalCode) : booking.id;

    const values = buildNewReservationRequestTemplateValues({
      reservationCode,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      villaName: booking.villa.name,
      villaRegion: booking.villa.region?.name ?? "",
      villaCheckInTime: booking.villa.checkInTime || "16:00",
      villaCheckOutTime: booking.villa.checkOutTime || "10:00",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
      pets: booking.pets,
      details,
      totalPrice: booking.totalPrice,
      company: {
        agencyName: company.agencyName,
        brandName: company.brandName,
        companyTitle: company.companyTitle,
        domain: company.domain,
        logoUrl: company.logoUrl,
        email: company.email,
        phone: company.phone,
        address: company.address,
      },
    });

    if (guestTemplate) {
      const mailBody = pickChannelBody(guestTemplate, "email").trim();
      const waBody = pickChannelBody(guestTemplate, "whatsapp").trim();
      const smsBody = pickChannelBody(guestTemplate, "sms").trim();

      if (mailBody && booking.guestEmail.trim()) {
        try {
          const message = renderAgencyMessageTemplate(mailBody, values);
          const logoUrl =
            values.SITELOGOURL ||
            resolveCompanyLogoUrl(company.logoUrl, company.domain);
          await sendCompanyMail(company, {
            to: booking.guestEmail.trim(),
            subject: `${reservationCode} nolu rezervasyon talebiniz alındı`,
            text: message.replace(/^\s*\n+/, ""),
            html: toHtmlFromText(message, logoUrl),
          });
        } catch (error) {
          console.error("[new-reservation-notify] misafir mail hatası", error);
        }
      }

      if (waBody && booking.guestPhone.trim()) {
        try {
          const message = renderAgencyMessageTemplate(waBody, values);
          await sendGuestWhatsApp(booking.guestPhone, message);
        } catch (error) {
          console.error("[new-reservation-notify] WhatsApp hatası", error);
        }
      }

      if (smsBody && booking.guestPhone.trim()) {
        try {
          const message = renderAgencyMessageTemplate(smsBody, values);
          await sendGuestSms(booking.guestPhone, message, booking.id);
        } catch (error) {
          console.error("[new-reservation-notify] SMS hatası", error);
        }
      }
    } else {
      console.warn(
        "[new-reservation-notify] Mesaj İçeriği 1 (rowNo=1) bulunamadı"
      );
    }

    if (adminTemplate) {
      const mailBody = pickChannelBody(adminTemplate, "email").trim();
      if (mailBody) {
        try {
          const message = renderAgencyMessageTemplate(mailBody, values);
          await sendCompanyMail(company, {
            to: ADMIN_NOTIFY_EMAIL,
            subject: `Yeni rezervasyon talebi #${reservationCode} — ${booking.villa.name}`,
            text: message,
            html: toHtmlFromText(message),
          });
        } catch (error) {
          console.error("[new-reservation-notify] yönetim mail hatası", error);
        }
      }
    } else {
      console.warn(
        "[new-reservation-notify] Mesaj İçeriği 2 (rowNo=2) bulunamadı"
      );
    }
  } catch (error) {
    console.error("[new-reservation-notify] beklenmeyen hata", error);
  }
}
