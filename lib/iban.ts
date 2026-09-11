/** Türkiye IBAN: TR + 24 rakam = 26 hane (GİB type_ibanNo minLength/maxLength 26). */
export const TURKISH_IBAN_LENGTH = 26;

export function normalizeIban(iban: string | null | undefined): string {
  return (iban ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const expanded = rearranged.replace(/[A-Z]/g, (char) =>
    String(char.charCodeAt(0) - 55)
  );
  let remainder = 0n;
  for (const digit of expanded) {
    remainder = (remainder * 10n + BigInt(digit)) % 97n;
  }
  return Number(remainder);
}

/** ISO 13616: geçerli IBAN için mod 97 sonucu 1 olmalı. */
export function hasValidIbanChecksum(iban: string): boolean {
  const compact = normalizeIban(iban);
  if (compact.length < 15 || compact.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(compact)) return false;
  return ibanMod97(compact) === 1;
}

export function isValidTurkishIban(iban: string | null | undefined): boolean {
  const compact = normalizeIban(iban);
  return /^TR[0-9]{24}$/.test(compact) && hasValidIbanChecksum(compact);
}

/** Boş veya geçersiz IBAN için BTRANS/eksik-alan mesajı; geçerliyse null. */
export function turkishIbanIssue(iban: string | null | undefined): string | null {
  const compact = normalizeIban(iban);
  if (!compact) return "IBAN (26 hane)";
  if (compact.length !== TURKISH_IBAN_LENGTH) {
    return `IBAN ${compact.length} hane (GİB 26 hane ister)`;
  }
  if (!/^TR[0-9]{24}$/.test(compact)) {
    return "IBAN formatı (TR + 24 rakam)";
  }
  if (!hasValidIbanChecksum(compact)) {
    return "IBAN kontrol hanesi hatalı";
  }
  return null;
}
