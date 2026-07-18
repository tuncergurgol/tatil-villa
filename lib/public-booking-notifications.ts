import {
  buildNewReservationRequestTemplateValues,
  renderAgencyMessageTemplate,
  stripZeroAmountLines,
} from "@/lib/agency-message-render";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_1,
  AGENCY_MESSAGE_TEMPLATE_ROW_2,
} from "@/lib/agency-message-row-no";
import { parseBookingDetails } from "@/lib/booking-form-details";
import {
  appendBookingSiteFooter,
  resolveBookingSiteBrand,
} from "@/lib/booking-site-brand";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { prepareCompanyLogoForEmail } from "@/lib/email-logo";
import { getAgencyMessageTemplateByRowNo } from "@/lib/queries/agency-message-templates";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";

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

async function sendGuestWhatsApp(phone: string, message: string) {
  const result = await sendCustomerNotificationWhatsApp(phone, message);
  if (!result.ok) {
    console.warn(
      "[new-reservation-notify] WhatsApp:",
      result.error ?? "mesaj gönderilemedi",
      phone
    );
    return false;
  }
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
    const [company, agencySites, guestTemplate, adminTemplate] =
      await Promise.all([
        getCompanySettings(),
        getAgencySitesForPicker(),
        getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_1),
        getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_2),
      ]);

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
        brandName: siteBrand.siteInfo || company.brandName,
        companyTitle: company.companyTitle,
        domain: siteBrand.domain || company.domain,
        logoUrl: siteBrand.logoUrl || company.logoUrl,
        email: company.email,
        phone: company.phone,
        address: company.address,
      },
    });

    const emailLogo = await prepareCompanyLogoForEmail(
      siteBrand.logoUrl || company.logoUrl,
      siteBrand.domain || company.domain
    );

    if (guestTemplate) {
      const mailBody = pickChannelBody(guestTemplate, "email").trim();
      const waBody = pickChannelBody(guestTemplate, "whatsapp").trim();
      const smsBody = pickChannelBody(guestTemplate, "sms").trim();

      if (mailBody && booking.guestEmail.trim()) {
        try {
          const message = stripZeroAmountLines(
            renderAgencyMessageTemplate(mailBody, values)
          );
          await sendCompanyMail(company, {
            to: booking.guestEmail.trim(),
            subject: `${reservationCode} nolu rezervasyon talebiniz alındı`,
            text: message.replace(/^\s*\n+/, ""),
            html: toHtmlFromText(message, emailLogo.src),
            attachments: emailLogo.attachments,
          });
        } catch (error) {
          console.error("[new-reservation-notify] misafir mail hatası", error);
        }
      }

      if (waBody && booking.guestPhone.trim()) {
        try {
          const message = appendBookingSiteFooter(
            renderAgencyMessageTemplate(waBody, values),
            siteBrand.siteInfo
          );
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
          const message = stripZeroAmountLines(
            renderAgencyMessageTemplate(mailBody, values)
          );
          await sendCompanyMail(company, {
            to: ADMIN_NOTIFY_EMAIL,
            subject: `Yeni rezervasyon talebi #${reservationCode} — ${booking.villa.name}`,
            text: message,
            html: toHtmlFromText(message, emailLogo.src),
            attachments: emailLogo.attachments,
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
