"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  BOOKING_PREPAYMENT_OPTION_HOURS,
  buildPrepaymentShareMessage,
  type PrepaymentShareChannel,
} from "@/lib/booking-prepayment-share";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { prisma } from "@/lib/db";

const sendPrepaymentInfoSchema = z.object({
  bookingId: z.string().min(1),
  reservationCode: z.string().min(1),
  guestName: z.string().min(1),
  guestPhone: z.string(),
  guestEmail: z.string(),
  prepaymentAmount: z.number().positive("Ön ödeme tutarı zorunludur"),
  paymentChannel: z.string().min(1, "Ödeme kanalı zorunludur"),
  optionHours: z.coerce
    .number()
    .refine(
      (value) =>
        BOOKING_PREPAYMENT_OPTION_HOURS.includes(
          value as (typeof BOOKING_PREPAYMENT_OPTION_HOURS)[number]
        ),
      "Geçersiz opsiyon süresi"
    ),
  sendWhatsApp: z.boolean(),
  sendEmail: z.boolean(),
});

export type SendBookingPrepaymentInfoResult =
  | { success: true; channels: PrepaymentShareChannel[] }
  | { success: false; error: string };

export async function sendBookingPrepaymentInfoAction(
  payload: z.infer<typeof sendPrepaymentInfoSchema>
): Promise<SendBookingPrepaymentInfoResult> {
  await requireAdmin();

  const parsed = sendPrepaymentInfoSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const data = parsed.data;

  if (!data.sendWhatsApp && !data.sendEmail) {
    return {
      success: false,
      error: "En az bir bildirim kanalı seçilmelidir",
    };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: { id: true },
  });

  if (!booking) {
    return { success: false, error: "Rezervasyon bulunamadı" };
  }

  const phone = data.guestPhone.trim();
  const email = data.guestEmail.trim();

  if (data.sendWhatsApp && !phone) {
    return {
      success: false,
      error: "WhatsApp gönderimi için müşteri telefonu gerekli",
    };
  }

  if (data.sendEmail && (!email || isImportedPlaceholderEmail(email))) {
    return {
      success: false,
      error: "E-posta gönderimi için geçerli müşteri e-postası gerekli",
    };
  }

  const message = buildPrepaymentShareMessage({
    reservationCode: data.reservationCode,
    guestName: data.guestName,
    prepaymentAmount: data.prepaymentAmount,
    paymentChannel: data.paymentChannel,
    optionHours: data.optionHours,
  });

  const sentChannels: PrepaymentShareChannel[] = [];

  if (data.sendWhatsApp) {
    console.info("[booking-prepayment-share] WhatsApp", {
      bookingId: data.bookingId,
      phone,
      message,
    });
    sentChannels.push("whatsapp");
  }

  if (data.sendEmail) {
    console.info("[booking-prepayment-share] Email", {
      bookingId: data.bookingId,
      email,
      message,
    });
    sentChannels.push("email");
  }

  return { success: true, channels: sentChannels };
}
