/** Yolcu360 API: expireMonth 01–12, expireYear YYYY */
export function normalizeCardExpireMonth(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const month = Number.parseInt(digits, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Geçersiz son kullanma ayı");
  }
  return String(month).padStart(2, "0");
}

export function normalizeCardExpireYear(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 2) {
    return `20${digits}`;
  }
  if (digits.length === 4) {
    return digits;
  }

  throw new Error("Son kullanma yılı YY veya YYYY formatında olmalı");
}
