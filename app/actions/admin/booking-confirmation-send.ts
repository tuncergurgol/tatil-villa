"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  buildBookingConfirmationTemplateValues,
  renderAgencyMessageTemplate,
} from "@/lib/agency-message-render";
import { AGENCY_MESSAGE_TEMPLATE_ROW_4 } from "@/lib/agency-message-row-no";
import type { PrepaymentShareChannel } from "@/lib/booking-prepayment-share";
import {
  normalizeConfirmationSends,
  parseBookingDetails,
  resolveExternalCode,
  type BookingConfirmationSendRecord,
} from "@/lib/booking-form-details";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { normalizeCompanyPaymentType } from "@/lib/company-payment-types";
import { prisma } from "@/lib/db";
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

const sendConfirmationSchema = z.object({
  bookingId: z.string().min(1),
  sendWhatsApp: z.boolean(),
  sendEmail: z.boolean(),
  sendSms: z.boolean(),
});

export type SendBookingConfirmationResult =
  | {
      success: true;
      channels: PrepaymentShareChannel[];
      confirmationSentAt: string;
      confirmationSend: BookingConfirmationSendRecord;
      confirmationSends: BookingConfirmationSendRecord[];
    }
  | { success: false; error: string };

function pickChannelBody(
  template: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  },
  channel: PrepaymentShareChannel
): string {
  switch (channel) {
    case "sms":
      return template.smsBody || template.whatsappBody || template.mailBody;
    case "whatsapp":
      return template.whatsappBody || template.mailBody || template.smsBody;
    case "email":
      return template.mailBody || template.whatsappBody || template.smsBody;
  }
}

async function resolveBankAccount(paymentMethod: string) {
  const normalized = normalizeCompanyPaymentType(paymentMethod);
  if (normalized !== "bank_transfer") return null;

  return prisma.companyBankAccount.findFirst({
    where: {
      active: true,
      OR: [{ paymentType: normalized }, { paymentType: "" }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      bankName: true,
      accountHolder: true,
      iban: true,
    },
  });
}

export async function sendBookingConfirmationAction(
  payload: z.infer<typeof sendConfirmationSchema>
): Promise<SendBookingConfirmationResult> {
  await requireAdmin();

  const parsed = sendConfirmationSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const data = parsed.data;

  if (!data.sendWhatsApp && !data.sendEmail && !data.sendSms) {
    return {
      success: false,
      error: "En az bir bildirim kanalı seçilmelidir",
    };
  }

  const [booking, template, companySettings] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        villa: {
          select: {
            name: true,
          },
        },
        prepayments: {
          select: {
            amount: true,
            paymentChannel: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_4),
    getCompanySettings(),
  ]);

  if (!booking) {
    return { success: false, error: "Rezervasyon bulunamadı" };
  }

  if (booking.prepayments.length === 0) {
    return {
      success: false,
      error: "Konfirme göndermek için en az bir ön ödeme kaydı gerekli",
    };
  }

  if (!template) {
    return {
      success: false,
      error: `Mesaj şablonu bulunamadı (${AGENCY_MESSAGE_TEMPLATE_ROW_4})`,
    };
  }

  const phone = booking.guestPhone.trim();
  const email = booking.guestEmail.trim();
  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) || "—";

  if (data.sendWhatsApp) {
    if (!phone) {
      return {
        success: false,
        error: "WhatsApp gönderimi için müşteri telefonu gerekli",
      };
    }
    const e164 = normalizePhoneToE164(phone);
    if (!e164 || !isValidTurkishMobileE164(e164)) {
      return {
        success: false,
        error: "Geçersiz telefon numarası. Türkiye cep numarası girin",
      };
    }
  }

  if (data.sendSms && !phone) {
    return {
      success: false,
      error: "SMS gönderimi için müşteri telefonu gerekli",
    };
  }

  if (data.sendEmail && (!email || isImportedPlaceholderEmail(email))) {
    return {
      success: false,
      error: "E-posta gönderimi için geçerli müşteri e-postası gerekli",
    };
  }

  const details = parseBookingDetails(booking.details);
  const paymentMethod =
    booking.prepayments[0]?.paymentChannel?.trim() ||
    details.importPaymentMethod?.trim() ||
    details.prepaymentBank?.trim() ||
    "";
  const prepaymentAmount = booking.prepayments.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const bankAccount = await resolveBankAccount(paymentMethod);

  const templateValues = buildBookingConfirmationTemplateValues({
    reservationCode,
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    villaName: booking.villa.name,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    adults: booking.adults,
    children: booking.children,
    details,
    prepaymentAmount,
    paymentMethod,
    company: {
      agencyName: companySettings.agencyName,
      brandName: companySettings.brandName,
      companyTitle: companySettings.companyTitle,
      domain: companySettings.domain,
      logoUrl: companySettings.logoUrl,
    },
    bankAccount,
  });

  const sentChannels: PrepaymentShareChannel[] = [];
  const mailSubject = `${reservationCode} nolu rezervasyon konfirmasyonu`;

  const channelRequests: Array<{
    channel: PrepaymentShareChannel;
    enabled: boolean;
  }> = [
    { channel: "whatsapp", enabled: data.sendWhatsApp },
    { channel: "email", enabled: data.sendEmail },
    { channel: "sms", enabled: data.sendSms },
  ];

  for (const { channel, enabled } of channelRequests) {
    if (!enabled) continue;

    const bodyTemplate = pickChannelBody(template, channel);
    if (!bodyTemplate.trim()) {
      return {
        success: false,
        error: `${channel.toUpperCase()} kanalı için mesaj şablonu boş`,
      };
    }

    const message = renderAgencyMessageTemplate(bodyTemplate, templateValues);

    if (channel === "email") {
      try {
        await sendCompanyMail(companySettings, {
          to: email,
          subject: mailSubject,
          text: message,
        });
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "E-posta gönderilemedi",
        };
      }
    } else if (channel === "whatsapp") {
      const evolution = await getEvolutionWhatsappAdminData();
      if (!evolution.evolutionApiKey || !evolution.evolutionBaseUrl) {
        return {
          success: false,
          error:
            "Sistem WhatsApp (Evolution) ayarları eksik. Acente → Evolution WhatsApp sayfasından yapılandırın.",
        };
      }

      try {
        await sendEvolutionTextMessage(
          evolution.evolutionBaseUrl,
          evolution.evolutionApiKey,
          evolution.evolutionInstanceName,
          toWhatsAppRecipient(normalizePhoneToE164(phone)),
          message
        );
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "WhatsApp mesajı gönderilemedi",
        };
      }
    } else {
      console.info(`[booking-confirmation-send] ${channel}`, {
        bookingId: data.bookingId,
        phone,
        templateRowNo: AGENCY_MESSAGE_TEMPLATE_ROW_4,
        message,
      });
    }

    sentChannels.push(channel);
  }

  const sentAt = new Date();
  const confirmationSend: BookingConfirmationSendRecord = {
    id: crypto.randomUUID(),
    sentAt: sentAt.toISOString(),
    channels: sentChannels,
    status: "sent",
  };

  const existingSends = normalizeConfirmationSends(details.confirmationSends);
  const confirmationSends = [...existingSends, confirmationSend];

  await prisma.booking.update({
    where: { id: data.bookingId },
    data: {
      status: BookingStatus.CONFIRMATION_SENT,
      confirmationSentAt: sentAt,
      details: {
        ...details,
        confirmationSends,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  return {
    success: true,
    channels: sentChannels,
    confirmationSentAt: sentAt.toISOString(),
    confirmationSend,
    confirmationSends,
  };
}
