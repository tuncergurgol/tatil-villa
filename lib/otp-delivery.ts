import {
  isValidWhatsAppPhoneE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import { isSmsOtpEnabled, sendSmsOtpStub } from "@/lib/sms-otp";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";

export type OtpDeliveryChannel = "sms" | "whatsapp";

export type OtpDeliveryResult = {
  ok: boolean;
  channel: OtpDeliveryChannel;
  error?: string;
};

function buildOtpMessage(code: string, brandName?: string): string {
  const brand = brandName?.trim() || "Tatildeyiz";
  return `${brand} doğrulama kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir. Kimseyle paylaşmayın.`;
}

async function sendOtpViaWhatsApp(
  phoneE164: string,
  message: string
): Promise<OtpDeliveryResult> {
  const result = await sendCustomerNotificationWhatsApp(phoneE164, message);
  if (!result.ok) {
    console.error("[otp-delivery] WAHA gönderim hatası", result.error);
    return {
      ok: false,
      channel: "whatsapp",
      error: result.error ?? "Doğrulama kodu WhatsApp ile gönderilemedi",
    };
  }
  return { ok: true, channel: "whatsapp" };
}

/**
 * OTP gönderimi:
 * - smsOtpEnabled / SMS_OTP_ENABLED + Netgsm → SMS
 * - kapalıyken veya sağlayıcı yoksa → Bildirim WhatsApp (WAHA)
 */
export async function deliverOtpCode(
  phoneRaw: string,
  code: string,
  purpose: string,
  options?: { brandName?: string }
): Promise<OtpDeliveryResult> {
  const e164 = normalizePhoneToE164(phoneRaw);
  if (!e164 || !isValidWhatsAppPhoneE164(e164)) {
    return {
      ok: false,
      channel: "whatsapp",
      error: "Geçerli bir telefon numarası girin",
    };
  }

  const message = buildOtpMessage(code, options?.brandName);
  const smsEnabled = await isSmsOtpEnabled();

  if (smsEnabled) {
    const sms = await sendSmsOtpStub({
      phone: e164,
      message,
      purpose,
    });
    return {
      ok: sms.ok,
      channel: "sms",
      error: sms.ok
        ? undefined
        : sms.detail ?? "Doğrulama kodu SMS ile gönderilemedi",
    };
  }

  return sendOtpViaWhatsApp(e164, message);
}
