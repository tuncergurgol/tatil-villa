import { sendEvolutionTextMessage } from "@/lib/evolution-client";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
  toWhatsAppRecipient,
} from "@/lib/phone";
import { getEvolutionWhatsappAdminData } from "@/lib/queries/evolution-whatsapp";
import { getWahaWhatsappAdminData } from "@/lib/queries/waha-whatsapp";
import { sendWahaTextMessage } from "@/lib/waha-client";

export type WhatsAppSendResult = {
  ok: boolean;
  error?: string;
};

/**
 * Müşteriye giden tüm bildirim WhatsApp mesajları → Bildirim WhatsApp (WAHA).
 * Örn: ön ödeme, konfirme, giriş bilgisi (misafir), yeni talep, OTP.
 */
export async function sendCustomerNotificationWhatsApp(
  phone: string,
  text: string
): Promise<WhatsAppSendResult> {
  const e164 = normalizePhoneToE164(phone);
  if (!e164 || !isValidTurkishMobileE164(e164)) {
    return {
      ok: false,
      error: "Geçersiz telefon numarası. Türkiye cep numarası girin",
    };
  }

  const waha = await getWahaWhatsappAdminData();
  if (!waha.wahaApiKey?.trim() || !waha.wahaBaseUrl?.trim()) {
    return {
      ok: false,
      error:
        "Bildirim WhatsApp (WAHA) ayarları eksik. Acente → Bildirim WhatsApp sayfasından yapılandırın.",
    };
  }

  try {
    await sendWahaTextMessage(
      waha.wahaBaseUrl,
      waha.wahaApiKey,
      waha.wahaSessionName,
      toWhatsAppRecipient(e164),
      text
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "WhatsApp mesajı gönderilemedi",
    };
  }
}

/**
 * Operasyonel WhatsApp (takvim / misafir karşılayan) → Evolution.
 * Örn: villa yetkilisine giriş bilgilendirme paylaşımı.
 */
export async function sendOperationsWhatsApp(
  phone: string,
  text: string
): Promise<WhatsAppSendResult> {
  const e164 = normalizePhoneToE164(phone);
  if (!e164 || !isValidTurkishMobileE164(e164)) {
    return {
      ok: false,
      error: "Geçersiz telefon numarası. Türkiye cep numarası girin",
    };
  }

  const evolution = await getEvolutionWhatsappAdminData();
  if (!evolution.evolutionApiKey?.trim() || !evolution.evolutionBaseUrl?.trim()) {
    return {
      ok: false,
      error:
        "Evolution WhatsApp ayarları eksik. Acente → Evolution WhatsApp sayfasından yapılandırın.",
    };
  }

  try {
    await sendEvolutionTextMessage(
      evolution.evolutionBaseUrl,
      evolution.evolutionApiKey,
      evolution.evolutionInstanceName,
      toWhatsAppRecipient(e164),
      text
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "WhatsApp mesajı gönderilemedi",
    };
  }
}
