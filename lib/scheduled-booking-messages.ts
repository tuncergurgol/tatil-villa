import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import {
  appendBookingSiteFooter,
  resolveBookingSiteBrand,
} from "@/lib/booking-site-brand";
import { parseBookingDetails, type BookingDetails } from "@/lib/booking-form-details";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import {
  isValidWhatsAppPhoneE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import {
  sendCustomerNotificationWhatsApp,
  sendOperationsWhatsApp,
} from "@/lib/whatsapp-delivery";
import {
  buildCheckInInfoShareTemplateValues,
  ensureWhatsAppRawConfirmationUrl,
  renderAgencyMessageTemplate,
  resolveCheckInInfoShareCode,
  stripZeroAmountLines,
} from "@/lib/agency-message-render";
import { resolveExternalCode } from "@/lib/booking-form-details";
import {
  addDaysToDateKey,
  getIstanbulDateKey,
} from "@/lib/booking-calendar-days";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import {
  isGuestReviewTemplate,
  isTemplateDueNow,
  requiresPoolHeating,
  resolveAudienceForTemplateRowNo,
  resolveTargetAnchorDateKey,
} from "@/lib/agency-message-schedule";
import {
  buildGuestReviewInviteLink,
  ensureGuestReviewInvitation,
} from "@/lib/guest-review-invite";

const ELIGIBLE_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "CONFIRMATION_SENT",
  "COMPENSATION",
];

function hasPoolHeatingFees(details: BookingDetails): boolean {
  return (
    (details.poolHeatingPrivateFee ?? 0) > 0 ||
    (details.poolHeatingIndoorFee ?? 0) > 0 ||
    (details.poolHeatingKidsFee ?? 0) > 0
  );
}

function resolveGreeter(villa: {
  greeterName: string;
  greeterPhone: string;
  owner: {
    name: string;
    phone: string | null;
    email: string | null;
    authorizedPersonName: string | null;
  } | null;
}) {
  const greeterName =
    villa.greeterName.trim() ||
    villa.owner?.authorizedPersonName?.trim() ||
    villa.owner?.name?.trim() ||
    "";
  const greeterPhone =
    villa.greeterPhone.trim() || villa.owner?.phone?.trim() || "";
  return { greeterName, greeterPhone };
}

function pickBody(
  template: { smsBody: string; whatsappBody: string; mailBody: string },
  channel: "whatsapp" | "email"
) {
  if (channel === "email") {
    return template.mailBody || template.whatsappBody || template.smsBody;
  }
  return template.whatsappBody || template.smsBody || template.mailBody;
}

export type ScheduledMessageSendResult = {
  ok: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
};

export async function sendScheduledBookingMessage(
  bookingId: string,
  templateRowNo: number
): Promise<ScheduledMessageSendResult> {
  const [booking, template, company, agencySites] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        villa: {
          select: {
            name: true,
            originalName: true,
            location: true,
            checkInTime: true,
            checkOutTime: true,
            greeterName: true,
            greeterPhone: true,
            owner: {
              select: {
                name: true,
                phone: true,
                email: true,
                authorizedPersonName: true,
              },
            },
          },
        },
        guestReview: { select: { id: true } },
        guestReviewInvitation: { select: { usedAt: true } },
      },
    }),
    prisma.agencyMessageTemplate.findFirst({
      where: { rowNo: templateRowNo, active: true },
    }),
    getCompanySettings(),
    getAgencySitesForPicker(),
  ]);

  if (!booking || !template) {
    return {
      ok: false,
      emailSent: false,
      whatsappSent: false,
      errors: ["Rezervasyon veya şablon bulunamadı"],
    };
  }

  if (!ELIGIBLE_BOOKING_STATUSES.includes(booking.status)) {
    return {
      ok: false,
      emailSent: false,
      whatsappSent: false,
      errors: ["Rezervasyon durumu uygun değil"],
    };
  }

  const details = parseBookingDetails(booking.details);
  if (requiresPoolHeating(templateRowNo) && !hasPoolHeatingFees(details)) {
    return {
      ok: false,
      emailSent: false,
      whatsappSent: false,
      errors: ["Havuz ısıtma talebi yok"],
    };
  }

  if (isGuestReviewTemplate(templateRowNo)) {
    if (booking.guestReview || booking.guestReviewInvitation?.usedAt) {
      return {
        ok: false,
        emailSent: false,
        whatsappSent: false,
        errors: ["Yorum zaten gönderilmiş"],
      };
    }
    if (!company.guestReviewInvitesEnabled) {
      return {
        ok: false,
        emailSent: false,
        whatsappSent: false,
        errors: ["Misafir yorum davetleri kapalı"],
      };
    }
  }

  const audience = resolveAudienceForTemplateRowNo(templateRowNo);
  const { greeterName, greeterPhone } = resolveGreeter(booking.villa);
  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) || "—";
  const shareCode = resolveCheckInInfoShareCode(booking.id);
  const siteBrand = resolveBookingSiteBrand({
    siteInfo: details.siteInfo,
    originDomain: details.originDomain,
    company,
    agencySites,
  });
  const publicDomain = siteBrand.domain;
  const guestPhone = booking.guestPhone.trim();
  const guestEmail = booking.guestEmail.trim();
  const ownerPhone = greeterPhone;
  const ownerEmail = booking.villa.owner?.email?.trim() || "";
  const phone = audience === "guest" ? guestPhone : ownerPhone;
  const email = audience === "guest" ? guestEmail : ownerEmail;
  const recipientName =
    audience === "guest"
      ? booking.guestName
      : greeterName || booking.villa.owner?.name || "Yetkili";

  const templateValues = buildCheckInInfoShareTemplateValues({
    reservationCode,
    shareCode,
    guestName: booking.guestName,
    guestEmail,
    guestPhone,
    villaName: booking.villa.name,
    villaOriginalName: booking.villa.originalName,
    villaRegion: booking.villa.location,
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
    audience,
    recipientName,
    greeterName,
    greeterPhone,
    company: {
      agencyName: company.agencyName,
      brandName: siteBrand.siteInfo || company.brandName,
      companyTitle: company.companyTitle,
      domain: publicDomain,
      logoUrl: siteBrand.logoUrl || company.logoUrl,
      email: company.email,
      phone: company.phone,
      address: company.address,
    },
  });

  if (isGuestReviewTemplate(templateRowNo)) {
    const invitation = await ensureGuestReviewInvitation(bookingId);
    templateValues.YORUMLINK = buildGuestReviewInviteLink(
      publicDomain,
      invitation.token
    );
  }

  const errors: string[] = [];
  let emailSent = false;
  let whatsappSent = false;

  const waBody = pickBody(template, "whatsapp");
  const mailBody = pickBody(template, "email");

  if (phone) {
    const e164 = normalizePhoneToE164(phone);
    if (e164 && isValidWhatsAppPhoneE164(e164) && waBody.trim()) {
      const rendered = renderAgencyMessageTemplate(waBody, templateValues);
      const message = ensureWhatsAppRawConfirmationUrl(
        appendBookingSiteFooter(rendered, siteBrand.siteInfo)
      );
      const wa =
        audience === "guest"
          ? await sendCustomerNotificationWhatsApp(phone, message)
          : await sendOperationsWhatsApp(phone, message);
      if (wa.ok) {
        whatsappSent = true;
      } else {
        errors.push(wa.error ?? "WhatsApp gönderilemedi");
      }
    }
  }

  if (
    email &&
    !isImportedPlaceholderEmail(email) &&
    company.smtpEnabled &&
    mailBody.trim()
  ) {
    try {
      const rendered = stripZeroAmountLines(
        renderAgencyMessageTemplate(mailBody, templateValues)
      );
      await sendCompanyMail(company, {
        to: email,
        subject: `${reservationCode} — ${template.name}`,
        text: rendered,
        html: toHtmlFromText(rendered),
      });
      emailSent = true;
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "E-posta gönderilemedi"
      );
    }
  }

  if (emailSent || whatsappSent) {
    const channels = [
      whatsappSent ? "whatsapp" : null,
      emailSent ? "email" : null,
    ]
      .filter(Boolean)
      .join(",");

    await prisma.bookingScheduledMessageLog.upsert({
      where: {
        bookingId_templateRowNo: { bookingId, templateRowNo },
      },
      create: { bookingId, templateRowNo, channels },
      update: { channels, sentAt: new Date() },
    });

    if (isGuestReviewTemplate(templateRowNo)) {
      const invitation = await prisma.guestReviewInvitation.findUnique({
        where: { bookingId },
      });
      if (invitation) {
        await prisma.guestReviewInvitation.update({
          where: { id: invitation.id },
          data: {
            emailSentAt: emailSent ? new Date() : invitation.emailSentAt,
            whatsappSentAt: whatsappSent ? new Date() : invitation.whatsappSentAt,
          },
        });
      }
    }
  }

  return {
    ok: emailSent || whatsappSent,
    emailSent,
    whatsappSent,
    errors,
  };
}

export async function runScheduledBookingMessages(now = new Date()) {
  const company = await getCompanySettings();
  if (!company.scheduledBookingMessagesEnabled) {
    return { ok: false, message: "Zamanlanmış mesajlar kapalı", sent: 0 };
  }

  const templates = await prisma.agencyMessageTemplate.findMany({
    where: { active: true, scheduleEnabled: true },
    orderBy: [{ scheduleHour: "asc" }, { rowNo: "asc" }],
  });

  const dueTemplates = templates.filter((template) =>
    isTemplateDueNow(template, now)
  );

  if (dueTemplates.length === 0) {
    return { ok: true, message: "Bu saatte gönderilecek şablon yok", sent: 0 };
  }

  const todayKey = getIstanbulDateKey(now);
  let sent = 0;
  const failures: string[] = [];

  for (const template of dueTemplates) {
    const anchorDateKey = resolveTargetAnchorDateKey(
      template,
      todayKey,
      addDaysToDateKey
    );
    const anchorField =
      template.scheduleAnchor === "check_out" ? "checkOut" : "checkIn";
    const anchorDate = dateKeyToDbDate(anchorDateKey);

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ELIGIBLE_BOOKING_STATUSES },
        [anchorField]: anchorDate,
        scheduledMessageLogs: {
          none: { templateRowNo: template.rowNo },
        },
      },
      select: { id: true, externalCode: true },
      take: 30,
    });

    for (const booking of bookings) {
      const result = await sendScheduledBookingMessage(
        booking.id,
        template.rowNo
      );
      if (result.ok) {
        sent += 1;
      } else if (
        result.errors.length > 0 &&
        !(
          template.rowNo === 402 &&
          result.errors.includes("Havuz ısıtma talebi yok")
        )
      ) {
        failures.push(
          `${booking.externalCode ?? booking.id} (${template.rowNo}): ${result.errors.join(", ")}`
        );
      }
    }
  }

  return {
    ok: sent > 0 || failures.length === 0,
    message:
      sent > 0
        ? `${sent} zamanlanmış mesaj gönderildi`
        : failures[0] ?? "Gönderilecek mesaj yok",
    sent,
    failures,
    templates: dueTemplates.map((t) => t.rowNo),
  };
}
