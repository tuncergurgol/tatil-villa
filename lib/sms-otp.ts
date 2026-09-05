import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  isSmsProviderConfigured,
  sendSmsMessage,
  type SmsSendResult,
} from "@/lib/sms-delivery";

/**
 * SMS OTP açık mı?
 * Öncelik: env SMS_OTP_ENABLED=true|1|yes → company settings smsOtpEnabled
 * Ayrıca sağlayıcı yapılandırılmış olmalı (aksi halde WhatsApp'a düşer).
 */
export async function isSmsOtpEnabled(): Promise<boolean> {
  if (!isSmsProviderConfigured()) return false;

  const env = process.env.SMS_OTP_ENABLED?.trim().toLowerCase();
  if (env === "true" || env === "1" || env === "yes") return true;
  if (env === "false" || env === "0" || env === "no") return false;

  try {
    const settings = await getCompanySettings();
    return Boolean(settings.smsOtpEnabled);
  } catch {
    return false;
  }
}

/** @deprecated sendSmsMessage kullanın — geriye uyumluluk */
export async function sendSmsOtpStub(params: {
  phone: string;
  message: string;
  purpose: string;
}): Promise<SmsSendResult> {
  return sendSmsMessage({
    phone: params.phone,
    message: params.message,
    purpose: params.purpose,
  });
}
