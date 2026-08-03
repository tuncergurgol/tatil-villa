import {
  buildNewReservationRequestTemplateValues,
  renderAgencyMessageTemplate,
  stripZeroAmountLines,
} from "@/lib/agency-message-render";
import { AGENCY_MESSAGE_TEMPLATE_ROW_202 } from "@/lib/agency-message-row-no";
import { parseBookingDetails, resolveExternalCode } from "@/lib/booking-form-details";
import {
  appendBookingSiteFooter,
  resolveBookingSiteBrand,
} from "@/lib/booking-site-brand";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { prepareCompanyLogoForEmail } from "@/lib/email-logo";
import {
  INTEGRATION_LEAD_NOTIFY_EMAIL,
  INTEGRATION_LEAD_NOTIFY_WHATSAPP,
} from "@/lib/integration-lead-notify";
import { getAgencyMessageTemplateByRowNo } from "@/lib/queries/agency-message-templates";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { formatVillaRegionLabelMahalleIlceIl } from "@/lib/queries/villa-location";
import { prisma } from "@/lib/db";
import { sendOperationsWhatsApp } from "@/lib/whatsapp-delivery";

function pickChannelBody(
  template: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  },
  channel: "whatsapp" | "email"
) {
  if (channel === "whatsapp") {
    return template.whatsappBody || template.smsBody || template.mailBody;
  }
  return template.mailBody || template.whatsappBody || template.smsBody;
}

/**
 * Misafir konfirmasyon belgesini onayladığında:
 * - Mesaj İçeriği 202 → info@tatildeyiz.com.tr e-posta
 * - Mesaj İçeriği 202 → Takvim WhatsApp (+902526180108)
 *
 * Bildirim hataları onay işlemini bozmaz.
 */
export async function notifyBookingConfirmedByGuest(
  bookingId: string
): Promise<void> {
  try {
    const [booking, adminTemplate, company, agencySites] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          externalCode: true,
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          checkIn: true,
          checkOut: true,
          adults: true,
          children: true,
          babies: true,
          pets: true,
          totalPrice: true,
          details: true,
          villa: {
            select: {
              name: true,
              checkInTime: true,
              checkOutTime: true,
              location: true,
              region: {
                select: {
                  name: true,
                  parent: {
                    select: {
                      name: true,
                      parent: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_202),
      getCompanySettings(),
      getAgencySitesForPicker(),
    ]);

    if (!booking) {
      console.warn(
        "[booking-confirmed-notify] rezervasyon bulunamadı",
        bookingId
      );
      return;
    }

    if (!adminTemplate) {
      console.warn(
        "[booking-confirmed-notify] Mesaj İçeriği 202 (rowNo=202) bulunamadı"
      );
      return;
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
    const reservationCode =
      resolveExternalCode(booking.externalCode, booking.guestEmail) ||
      booking.id;
    const villaRegion = booking.villa.region
      ? formatVillaRegionLabelMahalleIlceIl(booking.villa.region)
      : booking.villa.location || "";

    const values = buildNewReservationRequestTemplateValues({
      reservationCode,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      villaName: booking.villa.name,
      villaRegion,
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

    const mailBody = pickChannelBody(adminTemplate, "email").trim();
    const waBody = pickChannelBody(adminTemplate, "whatsapp").trim();

    if (mailBody) {
      try {
        const message = stripZeroAmountLines(
          renderAgencyMessageTemplate(mailBody, values)
        );
        await sendCompanyMail(company, {
          to: INTEGRATION_LEAD_NOTIFY_EMAIL,
          subject: `Rezervasyon onaylandı #${reservationCode} — ${booking.villa.name}`,
          text: message,
          html: toHtmlFromText(message, emailLogo.src),
          attachments: emailLogo.attachments,
        });
      } catch (error) {
        console.error("[booking-confirmed-notify] yönetim mail hatası", error);
      }
    }

    if (waBody) {
      try {
        const message = appendBookingSiteFooter(
          stripZeroAmountLines(renderAgencyMessageTemplate(waBody, values)),
          siteBrand.siteInfo
        );
        const result = await sendOperationsWhatsApp(
          INTEGRATION_LEAD_NOTIFY_WHATSAPP,
          message
        );
        if (!result.ok) {
          console.error(
            "[booking-confirmed-notify] Takvim WhatsApp hatası",
            result.error
          );
        }
      } catch (error) {
        console.error(
          "[booking-confirmed-notify] Takvim WhatsApp hatası",
          error
        );
      }
    }
  } catch (error) {
    console.error("[booking-confirmed-notify] beklenmeyen hata", error);
  }
}
