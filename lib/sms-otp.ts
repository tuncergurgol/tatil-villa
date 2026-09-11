import { getCompanySettings } from "@/lib/queries/company-settings";

/**
 * SMS OTP açık mı?
 * Öncelik: env SMS_OTP_ENABLED=true|1|yes → company settings smsOtpEnabled
 */
export async function isSmsOtpEnabled(): Promise<boolean> {
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

/**
 * SMS sağlayıcı stub — bağlanınca gerçek API buraya iner.
 * Şimdilik yalnızca log; false döner (gönderilemedi).
 */
export async function sendSmsOtpStub(params: {
  phone: string;
  message: string;
  purpose: string;
}): Promise<{ ok: boolean; provider: "stub"; detail?: string }> {
  console.info("[sms-otp] stub provider — SMS gönderilmedi", {
    phone: params.phone,
    purpose: params.purpose,
    messagePreview: params.message.slice(0, 80),
  });
  return {
    ok: false,
    provider: "stub",
    detail: "SMS provider henüz bağlı değil",
  };
}
