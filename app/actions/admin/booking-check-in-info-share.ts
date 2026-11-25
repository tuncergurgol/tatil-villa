"use server";

import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  buildCheckInInfoShareLink,
  buildCheckInInfoSharePath,
  buildCheckInInfoShareTemplateValues,
  ensureWhatsAppRawConfirmationUrl,
  renderAgencyMessageTemplate,
  resolveCheckInInfoShareCode,
  stripZeroAmountLines,
} from "@/lib/agency-message-render";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_11_1,
  AGENCY_MESSAGE_TEMPLATE_ROW_40_1,
  formatAgencyMessageRowNo,
} from "@/lib/agency-message-row-no";
import {
  CHECK_IN_INFO_GUEST_MAIL_BODY,
  CHECK_IN_INFO_GUEST_WHATSAPP_BODY,
  isWrongCheckInInfoMailBody,
} from "@/lib/agency-message-templates/check-in-info-guest";
import {
  CHECK_IN_INFO_OWNER_MAIL_BODY,
  CHECK_IN_INFO_OWNER_WHATSAPP_BODY,
} from "@/lib/agency-message-templates/check-in-info-owner";
import {
  appendBookingActivityLog,
  resolveActivityActor,
  type BookingActivityLogEntry,
} from "@/lib/booking-activity-log";
import {
  getPrepaymentShareChannelLabel,
  type PrepaymentShareChannel,
} from "@/lib/booking-prepayment-share";
import {
  parseBookingDetails,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { prepareCompanyLogoForEmail } from "@/lib/email-logo";
import {
  isValidWhatsAppPhoneE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import {
  appendBookingSiteFooter,
  resolveBookingSiteBrand,
} from "@/lib/booking-site-brand";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getAgencyMessageTemplateByRowNo } from "@/lib/queries/agency-message-templates";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  sendCustomerNotificationWhatsApp,
  sendOperationsWhatsApp,
} from "@/lib/whatsapp-delivery";
import { isSmsProviderConfigured, sendSmsMessage } from "@/lib/sms-delivery";

const audienceSchema = z.enum(["guest", "owner"]);

const inputSchema = z.object({
  bookingId: z.string().min(1),
  audience: audienceSchema,
  sendWhatsApp: z.boolean(),
  sendEmail: z.boolean(),
  sendSms: z.boolean().optional(),
});

export type CheckInInfoShareAudience = z.infer<typeof audienceSchema>;

export type CheckInInfoShareChannelResult = {
  channel: PrepaymentShareChannel;
  ok: boolean;
  error?: string;
};

function selectedChannels(input: {
  sendWhatsApp: boolean;
  sendEmail: boolean;
  sendSms?: boolean;
}): PrepaymentShareChannel[] {
  const channels: PrepaymentShareChannel[] = [];
  if (input.sendWhatsApp) channels.push("whatsapp");
  if (input.sendEmail) channels.push("email");
  if (input.sendSms) channels.push("sms");
  return channels;
}

function resolveCheckInInfoTemplateRowNo(
  audience: CheckInInfoShareAudience
): number {
  return audience === "owner"
    ? AGENCY_MESSAGE_TEMPLATE_ROW_40_1
    : AGENCY_MESSAGE_TEMPLATE_ROW_11_1;
}

function pickChannelBody(
  template: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  },
  channel: PrepaymentShareChannel,
  audience: CheckInInfoShareAudience
): string {
  const defaultWhatsApp =
    audience === "owner"
      ? CHECK_IN_INFO_OWNER_WHATSAPP_BODY
      : CHECK_IN_INFO_GUEST_WHATSAPP_BODY;
  const defaultMail =
    audience === "owner"
      ? CHECK_IN_INFO_OWNER_MAIL_BODY
      : CHECK_IN_INFO_GUEST_MAIL_BODY;

  switch (channel) {
    case "sms":
      return template.smsBody || template.whatsappBody || template.mailBody || defaultWhatsApp;
    case "whatsapp":
      return template.whatsappBody || template.mailBody || template.smsBody || defaultWhatsApp;
    case "email": {
      const mail = template.mailBody.trim();
      if (mail && !isWrongCheckInInfoMailBody(mail)) return mail;
      // Yanlış “rezervasyon talebi” / boş mail → giriş bilgilendirme varsayılanı
      if (!isWrongCheckInInfoMailBody(defaultMail)) {
        return defaultMail;
      }
      return template.whatsappBody || template.smsBody || defaultWhatsApp;
    }
  }
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

function formatChannelResultsError(
  results: CheckInInfoShareChannelResult[]
): string {
  return results
    .filter((item) => !item.ok)
    .map(
      (item) =>
        `${getPrepaymentShareChannelLabel(item.channel)}: ${item.error ?? "gönderilemedi"}`
    )
    .join(" · ");
}

async function loadCheckInInfoShareContext(
  bookingId: string,
  audience: CheckInInfoShareAudience
) {
  const templateRowNo = resolveCheckInInfoTemplateRowNo(audience);
  const [booking, template, companySettings, agencySites] = await Promise.all([
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
        prepayments: {
          select: { amount: true },
        },
      },
    }),
    getAgencyMessageTemplateByRowNo(templateRowNo),
    getCompanySettings(),
    getAgencySitesForPicker(),
  ]);

  if (!booking) {
    return { ok: false as const, error: "Rezervasyon bulunamadı" };
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return {
      ok: false as const,
      error:
        "Giriş bilgilendirme yalnızca onaylı rezervasyonlarda gönderilebilir",
    };
  }

  if (!template) {
    return {
      ok: false as const,
      error: `Mesaj şablonu bulunamadı (${formatAgencyMessageRowNo(templateRowNo)} / ${templateRowNo})`,
    };
  }

  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) || "—";
  const shareCode = resolveCheckInInfoShareCode(booking.id);
  const details = parseBookingDetails(booking.details);
  const { greeterName, greeterPhone } = resolveGreeter(booking.villa);

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

  const siteBrand = resolveBookingSiteBrand({
    siteInfo: details.siteInfo,
    originDomain: details.originDomain,
    company: {
      brandName: companySettings.brandName,
      domain: companySettings.domain,
      logoUrl: companySettings.logoUrl,
    },
    agencySites,
  });
  const publicDomain = siteBrand.domain;
  const previewPath =
    buildCheckInInfoShareLink(publicDomain, shareCode, audience) ||
    buildCheckInInfoSharePath(shareCode, audience);

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
      agencyName: companySettings.agencyName,
      brandName: siteBrand.siteInfo || companySettings.brandName,
      companyTitle: companySettings.companyTitle,
      domain: publicDomain,
      logoUrl: siteBrand.logoUrl || companySettings.logoUrl,
      email: companySettings.email,
      phone: companySettings.phone,
      address: companySettings.address,
    },
  });

  return {
    ok: true as const,
    booking,
    template,
    templateRowNo,
    companySettings,
    publicDomain,
    siteInfo: siteBrand.siteInfo,
    brandLogoUrl: siteBrand.logoUrl || companySettings.logoUrl,
    reservationCode,
    shareCode,
    previewPath,
    phone,
    email,
    recipientName,
    templateValues,
  };
}

export async function previewCheckInInfoShareAction(raw: {
  bookingId: string;
  audience: CheckInInfoShareAudience;
}): Promise<
  | {
      success: true;
      previewPath: string;
      absoluteLink: string;
      whatsappPreview: string;
      emailPreview: string;
      templateRowNo: number;
      templateLabel: string;
    }
  | { success: false; error: string }
> {
  try {
    await requireAdmin();
    const parsed = z
      .object({
        bookingId: z.string().min(1),
        audience: audienceSchema,
      })
      .safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Geçersiz istek" };
    }

    const ctx = await loadCheckInInfoShareContext(
      parsed.data.bookingId,
      parsed.data.audience
    );
    if (!ctx.ok) return { success: false, error: ctx.error };

    const waBody = pickChannelBody(
      ctx.template,
      "whatsapp",
      parsed.data.audience
    );
    const mailBody = pickChannelBody(
      ctx.template,
      "email",
      parsed.data.audience
    );
    const whatsappPreview = ensureWhatsAppRawConfirmationUrl(
      appendBookingSiteFooter(
        renderAgencyMessageTemplate(waBody, ctx.templateValues),
        ctx.siteInfo
      )
    );
    const emailPreview = stripZeroAmountLines(
      renderAgencyMessageTemplate(mailBody, ctx.templateValues)
    );
    const absoluteLink = buildCheckInInfoShareLink(
      ctx.publicDomain,
      ctx.shareCode,
      parsed.data.audience
    );

    return {
      success: true,
      previewPath: ctx.previewPath,
      absoluteLink,
      whatsappPreview,
      emailPreview,
      templateRowNo: ctx.templateRowNo,
      templateLabel: formatAgencyMessageRowNo(ctx.templateRowNo),
    };
  } catch (error) {
    console.error("previewCheckInInfoShareAction", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Önizleme yüklenemedi",
    };
  }
}

/**
 * Giriş bilgilendirme gönderir:
 * - Müşteri → Mesaj İçeriği 11.1 (111) — WhatsApp: Bildirim WhatsApp (WAHA)
 * - Villa yetkilisi → Mesaj İçeriği 40.1 (401) — WhatsApp: Evolution
 * E-posta → rezervasyon@ SMTP.
 * Kanallar bağımsız denenir; kısmi başarı kullanıcıya net bildirilir.
 */
export async function sendCheckInInfoShareAction(
  raw: z.infer<typeof inputSchema>
): Promise<
  | {
      success: true;
      channels: PrepaymentShareChannel[];
      channelResults: CheckInInfoShareChannelResult[];
      previewPath: string;
      activityLogs: BookingActivityLogEntry[];
      warning?: string;
    }
  | {
      success: false;
      error: string;
      channelResults?: CheckInInfoShareChannelResult[];
    }
> {
  try {
    const session = await requireAdmin();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Geçersiz istek" };
    }

    const { bookingId, audience, sendWhatsApp, sendEmail, sendSms } =
      parsed.data;
    const channels = selectedChannels({ sendWhatsApp, sendEmail, sendSms });
    if (channels.length === 0) {
      return {
        success: false,
        error: "En az bir bildirim kanalı seçilmelidir",
      };
    }

    const ctx = await loadCheckInInfoShareContext(bookingId, audience);
    if (!ctx.ok) return { success: false, error: ctx.error };

    if (sendWhatsApp) {
      if (!ctx.phone) {
        return {
          success: false,
          error:
            audience === "guest"
              ? "WhatsApp gönderimi için müşteri telefonu gerekli"
              : "Villa yetkilisi / karşılama telefonu yok",
        };
      }
      const e164 = normalizePhoneToE164(ctx.phone);
      if (!e164 || !isValidWhatsAppPhoneE164(e164)) {
        return {
          success: false,
          error: "Geçersiz telefon numarası",
        };
      }
    }

    if (sendEmail) {
      if (!ctx.email || isImportedPlaceholderEmail(ctx.email)) {
        return {
          success: false,
          error:
            audience === "guest"
              ? "E-posta gönderimi için geçerli müşteri e-postası gerekli"
              : "Villa yetkilisi e-posta adresi yok",
        };
      }
    }

    if (sendSms) {
      if (!isSmsProviderConfigured()) {
        return {
          success: false,
          error:
            "SMS sağlayıcısı yapılandırılmadı. .env içine NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_MSGHEADER ekleyin.",
        };
      }
      if (!ctx.phone) {
        return {
          success: false,
          error:
            audience === "guest"
              ? "SMS gönderimi için müşteri telefonu gerekli"
              : "Villa yetkilisi / karşılama telefonu yok",
        };
      }
      const e164Sms = normalizePhoneToE164(ctx.phone);
      if (!e164Sms || !isValidWhatsAppPhoneE164(e164Sms)) {
        return {
          success: false,
          error: "Geçersiz telefon numarası",
        };
      }
    }

    const channelResults: CheckInInfoShareChannelResult[] = [];
    const sentChannels: PrepaymentShareChannel[] = [];
    const mailSubject = `${ctx.reservationCode} nolu rezervasyon giriş bilgilendirme`;
    const emailLogo = sendEmail
      ? await prepareCompanyLogoForEmail(
          ctx.brandLogoUrl,
          ctx.publicDomain
        )
      : null;

    const channelRequests: Array<{
      channel: PrepaymentShareChannel;
      enabled: boolean;
    }> = [
      { channel: "whatsapp", enabled: sendWhatsApp },
      { channel: "email", enabled: sendEmail },
      { channel: "sms", enabled: Boolean(sendSms) },
    ];

    for (const { channel, enabled } of channelRequests) {
      if (!enabled) continue;

      const bodyTemplate = pickChannelBody(ctx.template, channel, audience);
      if (!bodyTemplate.trim()) {
        channelResults.push({
          channel,
          ok: false,
          error: `${getPrepaymentShareChannelLabel(channel)} kanalı için mesaj şablonu boş`,
        });
        continue;
      }

      const rendered = renderAgencyMessageTemplate(
        bodyTemplate,
        ctx.templateValues
      );
      const message =
        channel === "email" ? stripZeroAmountLines(rendered) : rendered;

      if (!message.trim()) {
        channelResults.push({
          channel,
          ok: false,
          error: `${getPrepaymentShareChannelLabel(channel)} mesaj gövdesi boş`,
        });
        continue;
      }

      if (channel === "email") {
        try {
          if (!ctx.companySettings.smtpEnabled) {
            throw new Error(
              "SMTP gönderimi devre dışı. Şirket ayarlarından SMTP’yi açın (rezervasyon@tatildeyiz.com.tr)."
            );
          }
          await sendCompanyMail(ctx.companySettings, {
            to: ctx.email,
            subject: mailSubject,
            text: message.replace(/^\s*\n+/, ""),
            html: toHtmlFromText(message, {
              logoUrl: emailLogo?.src,
            }),
            attachments: emailLogo?.attachments,
          });
          channelResults.push({ channel, ok: true });
          sentChannels.push(channel);
        } catch (error) {
          channelResults.push({
            channel,
            ok: false,
            error:
              error instanceof Error ? error.message : "E-posta gönderilemedi",
          });
        }
        continue;
      }

      if (channel === "whatsapp") {
        try {
          const whatsappMessage = ensureWhatsAppRawConfirmationUrl(
            appendBookingSiteFooter(
              message,
              ctx.siteInfo
            )
          );
          const wa =
            audience === "guest"
              ? await sendCustomerNotificationWhatsApp(ctx.phone, whatsappMessage)
              : await sendOperationsWhatsApp(ctx.phone, whatsappMessage);
          if (!wa.ok) {
            throw new Error(wa.error ?? "WhatsApp mesajı gönderilemedi");
          }
          channelResults.push({ channel, ok: true });
          sentChannels.push(channel);
        } catch (error) {
          channelResults.push({
            channel,
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "WhatsApp mesajı gönderilemedi",
          });
        }
        continue;
      }

      try {
        const sms = await sendSmsMessage({
          phone: ctx.phone,
          message,
          purpose: `check-in-info:${bookingId}:${audience}`,
        });
        if (!sms.ok) {
          throw new Error(sms.detail ?? "SMS gönderilemedi");
        }
        channelResults.push({ channel, ok: true });
        sentChannels.push(channel);
      } catch (error) {
        channelResults.push({
          channel,
          ok: false,
          error:
            error instanceof Error ? error.message : "SMS gönderilemedi",
        });
      }
    }

    if (sentChannels.length === 0) {
      return {
        success: false,
        error:
          formatChannelResultsError(channelResults) ||
          "Bilgilendirme gönderilemedi",
        channelResults,
      };
    }

    const actor = await resolveActivityActor(session.user);
    const channelLabels = sentChannels
      .map((channel) => getPrepaymentShareChannelLabel(channel))
      .join(", ");
    const audienceLabel =
      audience === "guest"
        ? "Müşteri bilgilendirme"
        : "Villa yetkilisi bilgilendirme";
    const templateLabel = formatAgencyMessageRowNo(ctx.templateRowNo);
    const failedNote = formatChannelResultsError(channelResults);

    const activityLogs = await appendBookingActivityLog(bookingId, {
      action: "check_in_info_shared",
      message: failedNote
        ? `${audienceLabel} kısmen gönderildi (${channelLabels}). Hatalar: ${failedNote}. Şablon ${templateLabel}. Önizleme: ${ctx.previewPath}`
        : `${audienceLabel} gönderildi (${channelLabels}). Şablon ${templateLabel}. Önizleme: ${ctx.previewPath}`,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      meta: {
        audience,
        channels: channelLabels,
        previewPath: ctx.previewPath,
        templateRowNo: ctx.templateRowNo,
        templateLabel,
        channelResults: JSON.stringify(channelResults),
      },
    });

    return {
      success: true,
      channels: sentChannels,
      channelResults,
      previewPath: ctx.previewPath,
      activityLogs,
      ...(failedNote ? { warning: failedNote } : {}),
    };
  } catch (error) {
    console.error("sendCheckInInfoShareAction", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Bilgilendirme gönderilemedi",
    };
  }
}
