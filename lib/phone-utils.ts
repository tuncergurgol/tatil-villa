import {
  buildE164Phone,
  parseStoredPhone,
} from "@/lib/phone-countries";

export function getTurkishPhoneLocalPart(phone: string): string {
  return parseStoredPhone(phone).national;
}

export function normalizeTurkishPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";

  let normalized = digits;
  if (normalized.startsWith("90") && normalized.length >= 12) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith("0") && normalized.length === 11) {
    normalized = normalized.slice(1);
  }

  return normalized.slice(-10);
}

export function formatTurkishPhoneDisplay(value: string): string {
  const digits = normalizeTurkishPhoneDigits(value);
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

/** E.164 (+90… / +49…); boşsa "" */
export function normalizeStoredTurkishPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const parsed = parseStoredPhone(trimmed);
  return buildE164Phone(parsed.country, parsed.national);
}

export function formatStoredTurkishPhoneDisplay(phone: string): string {
  if (!phone.trim()) return "-";

  const parsed = parseStoredPhone(phone);
  if (!parsed.national) return phone.trim();

  if (parsed.country.iso === "TR" && parsed.national.length === 10) {
    const d = parsed.national;
    return `+90 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  return `+${parsed.country.dial} ${parsed.national}`;
}

export function isValidStoredPhoneE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone.trim());
}
