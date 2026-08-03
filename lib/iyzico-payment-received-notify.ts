import {
  buildPaymentReceivedTemplateValues,
  renderAgencyMessageTemplate,
  stripZeroAmountLines,
} from "@/lib/agency-message-render";
import { AGENCY_MESSAGE_TEMPLATE_ROW_20_3 } from "@/lib/agency-message-row-no";
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

export type NotifyIyzicoPaymentReceivedInput = {
  bookingId: string;
  paidAmount: number;
  paymentId?: string | null;
};

/**
 * iyzico tahsilatı başarıyla kaydedildiğinde:
 * - Mesaj İçeriği 20.3 (203) → info@tatildeyiz.com.tr e-posta
 * - Mesaj İçeriği 20.3 (203) → Takvim WhatsApp (+902526180108)
 *
 * Bildirim hataları ödeme kaydını bozmaz.
 */
export async function notifyIyzicoPaymentReceived(
  input: NotifyIyzicoPaymentReceivedInput
): Promise<void> {
  try {
    const [booking, adminTemplate, company, agencySites] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: input.bookingId },
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
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_20_3),
      getCompanySettings(),
      getAgencySitesForPicker(),
    ]);

    if (!booking) {
      console.warn(
        "[iyzico-payment-received-notify] rezervasyon bulunamadı",
        input.bookingId
      );
      return;
    }

    if (!adminTemplate) {
      console.warn(
        "[iyzico-payment-received-notify] Mesaj İçeriği 20.3 (rowNo=203) bulunamadı"
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

    const values = buildPaymentReceivedTemplateValues({
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
      paidAmount: input.paidAmount,
      paymentId: input.paymentId,
      paymentProvider: "iyzico",
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
    const subject = `iyzico tahsilat alındı #${reservationCode} — ${booking.villa.name}`;

    if (mailBody) {
      try {
        const message = stripZeroAmountLines(
          renderAgencyMessageTemplate(mailBody, values)
        );
        await sendCompanyMail(company, {
          to: INTEGRATION_LEAD_NOTIFY_EMAIL,
          subject,
          text: message,
          html: toHtmlFromText(message, emailLogo.src),
          attachments: emailLogo.attachments,
        });
      } catch (error) {
        console.error(
          "[iyzico-payment-received-notify] yönetim mail hatası",
          error
        );
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
            "[iyzico-payment-received-notify] Takvim WhatsApp hatası",
            result.error
          );
        }
      } catch (error) {
        console.error(
          "[iyzico-payment-received-notify] Takvim WhatsApp hatası",
          error
        );
      }
    }
  } catch (error) {
    console.error("[iyzico-payment-received-notify] beklenmeyen hata", error);
  }
}
