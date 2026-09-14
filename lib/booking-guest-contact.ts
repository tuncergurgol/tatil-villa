import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";

const IMPORT_EMAIL_DOMAIN = "@tatildeyiz.local";

const PAYMENT_METHOD_HINTS = [
  "banka",
  "havale",
  "kredi",
  "kart",
  "cari",
  "eft",
  "nakit",
  "pesin",
  "peşin",
  "pos",
] as const;

export function isImportedPlaceholderEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(IMPORT_EMAIL_DOMAIN);
}

export function isLikelyPaymentMethodLabel(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (normalizeTurkishPhoneDigits(text).length === 10) return false;

  const normalized = text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");

  return PAYMENT_METHOD_HINTS.some((hint) => normalized.includes(hint));
}

export function normalizeGuestEmail(email: string | undefined | null): string {
  const trimmed = (email ?? "").trim();
  if (!trimmed || isImportedPlaceholderEmail(trimmed)) return "";
  return trimmed;
}

export function resolveGuestPhone(value: string | undefined | null): string {
  const raw = (value ?? "").trim();
  if (!raw || isLikelyPaymentMethodLabel(raw)) return "";
  return normalizeStoredTurkishPhone(raw);
}

export type ResolvedGuestContact = {
  fullName: string;
  phone: string;
  email: string;
};

export function resolveGuestContact(input: {
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
}): ResolvedGuestContact | null {
  const fullName = input.guestName.trim();
  if (!fullName) return null;

  return {
    fullName,
    phone: resolveGuestPhone(input.guestPhone),
    email: normalizeGuestEmail(input.guestEmail),
  };
}

export function pickBestPhone(values: string[]): string {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const phone = resolveGuestPhone(values[index]);
    if (phone) return phone;
  }
  return "";
}

export function pickBestEmail(values: string[]): string {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const email = normalizeGuestEmail(values[index]);
    if (email) return email;
  }
  return "";
}

export function buildGuestDedupKey(contact: ResolvedGuestContact): string {
  const digits = normalizeTurkishPhoneDigits(contact.phone);
  if (digits.length === 10) return `phone:${digits}`;

  const email = contact.email.toLowerCase();
  if (email) return `email:${email}`;

  return `name:${contact.fullName.toLocaleLowerCase("tr-TR")}`;
}
