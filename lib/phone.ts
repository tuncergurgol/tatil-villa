import { buildE164Phone, parseStoredPhone } from "@/lib/phone-countries";

/**
 * Telefon numarasını E.164 formatına çevirir.
 * + ile başlayan uluslararası numaralar korunur; yerel TR formları +90'a dönüşür.
 */
export function normalizePhoneToE164(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  const parsed = parseStoredPhone(trimmed);
  return buildE164Phone(parsed.country, parsed.national);
}

/** wa.me and similar APIs expect digits only, without + prefix. */
export function toWhatsAppRecipient(e164: string): string {
  return e164.replace(/\D/g, "");
}

export function isValidTurkishMobileE164(e164: string): boolean {
  return /^\+905\d{9}$/.test(e164);
}

/** Cep veya sabit hat (+90 + 10 hane) — operasyonel WhatsApp için */
export function isValidTurkishPhoneE164(e164: string): boolean {
  return /^\+90\d{10}$/.test(e164);
}

/** WhatsApp gönderimi için geçerli E.164 (ITU-T: 8–15 rakam) */
export function isValidWhatsAppPhoneE164(e164: string): boolean {
  return /^\+\d{8,15}$/.test(e164);
}
