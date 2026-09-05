"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { appendBookingSiteFooter } from "@/lib/booking-site-brand";
import {
  buildNewBookingWhatsAppShareMessage,
  type NewBookingWhatsAppSharePayload,
} from "@/lib/new-booking-whatsapp-share";
import { isValidWhatsAppPhoneE164, normalizePhoneToE164 } from "@/lib/phone";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";

const shareSchema = z.object({
  phone: z.string().min(1, "WhatsApp numarası gerekli"),
  villaName: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0).default(0),
  babies: z.coerce.number().int().min(0).default(0),
  accommodationTotal: z.number().nullable(),
  ownerDiscountAmount: z.number().nullable().optional(),
  agencyDiscountAmount: z.number().nullable().optional(),
  cleaningFee: z.number().nullable().optional(),
  underfloorHeatingFee: z.number().nullable().optional(),
  reservationTotal: z.number().nullable(),
  prepaymentAmount: z.number().nullable(),
  prepaymentRate: z.number(),
  entrancePayment: z.number().nullable(),
  damageDeposit: z.number().nullable().optional(),
  guestName: z.string().nullable().optional(),
});

export type ShareNewBookingWhatsAppResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function shareNewBookingQuoteWhatsAppAction(
  payload: NewBookingWhatsAppSharePayload & { phone: string }
): Promise<ShareNewBookingWhatsAppResult> {
  await requireAdmin();

  const parsed = shareSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz paylaşım bilgisi",
    };
  }

  const data = parsed.data;
  const e164 = normalizePhoneToE164(data.phone);
  if (!e164 || !isValidWhatsAppPhoneE164(e164)) {
    return { error: "Geçerli bir WhatsApp numarası girin" };
  }

  if (!data.reservationTotal || data.reservationTotal <= 0) {
    return { error: "Paylaşmak için geçerli bir fiyat özeti gerekli" };
  }

  const company = await getCompanySettings();
  const body = buildNewBookingWhatsAppShareMessage(data);
  const message = appendBookingSiteFooter(
    body,
    company.brandName || "Tatildeyiz"
  );

  const sent = await sendCustomerNotificationWhatsApp(e164, message);
  if (!sent.ok) {
    return { error: sent.error ?? "WhatsApp mesajı gönderilemedi" };
  }

  return { success: true, message: "WhatsApp mesajı gönderildi" };
}
