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

export function normalizeStoredTurkishPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = normalizeTurkishPhoneDigits(trimmed);
  if (!digits) return "";
  return `+90${digits}`;
}

export function formatStoredTurkishPhoneDisplay(phone: string): string {
  if (!phone.trim()) return "-";

  const digits = normalizeTurkishPhoneDigits(phone);
  if (digits.length !== 10) return phone;

  return `+90 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
