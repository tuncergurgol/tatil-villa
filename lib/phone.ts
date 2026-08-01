/**
 * Turkish phone numbers are normalized to E.164 (+905xxxxxxxxx).
 */
export function normalizePhoneToE164(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.startsWith("90") && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length >= 11) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90${digits}`;
  }

  if (digits.startsWith("90")) {
    return `+${digits}`;
  }

  return `+90${digits}`;
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
