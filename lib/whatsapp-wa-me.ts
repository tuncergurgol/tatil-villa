import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
  toWhatsAppRecipient,
} from "@/lib/phone";

const WA_ME_MAX_URL_LENGTH = 2000;

export type BuildWaMeUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function buildWaMeUrl(
  phone: string,
  message: string
): BuildWaMeUrlResult {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return { ok: false, error: "WhatsApp mesaj metni boş olamaz" };
  }

  const e164 = normalizePhoneToE164(phone);
  if (!e164) {
    return { ok: false, error: "Geçersiz telefon numarası" };
  }

  if (!isValidTurkishMobileE164(e164)) {
    return {
      ok: false,
      error: "Geçersiz telefon numarası. Türkiye cep numarası girin",
    };
  }

  const recipient = toWhatsAppRecipient(e164);
  const url = `https://wa.me/${recipient}?text=${encodeURIComponent(trimmedMessage)}`;

  if (url.length > WA_ME_MAX_URL_LENGTH) {
    return {
      ok: false,
      error: "Mesaj metni çok uzun; WhatsApp bağlantısı oluşturulamadı",
    };
  }

  return { ok: true, url };
}
