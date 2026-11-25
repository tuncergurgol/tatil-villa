/**
 * Banka toplu havale şablonu (BatchMoneyTransferTemplate.xlsx)
 * Sütunlar: Alıcı Adı Soyadı/Unvanı | IBAN | Tutar | Açıklama
 */

export const OWNER_PAYMENT_EXCEL_HEADERS = [
  "Alıcı Adı Soyadı/Unvanı",
  "IBAN",
  "Tutar",
  "Açıklama",
] as const;

export type OwnerPaymentExportOwner = {
  type: "GERCEK_KISI" | "TUZEL_KISI";
  name: string;
  firstName: string;
  lastName: string;
  companyTitle: string;
  bankAccountHolder: string;
  bankIban: string;
} | null;

export type OwnerPaymentExportInput = {
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  payableAmount: number;
  villaName: string;
  owner: OwnerPaymentExportOwner;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** DD/MM/YYYY — şablondaki tarih biçimi */
export function formatOwnerPaymentDate(date: Date): string {
  return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export function normalizeOwnerIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

export function resolveOwnerPaymentRecipientName(
  owner: OwnerPaymentExportOwner
): string {
  if (!owner) return "";
  const holder = owner.bankAccountHolder.trim();
  if (holder) return holder;
  if (owner.type === "TUZEL_KISI") {
    return owner.companyTitle.trim() || owner.name.trim();
  }
  const fullName = `${owner.firstName.trim()} ${owner.lastName.trim()}`.trim();
  return fullName || owner.name.trim();
}

export function buildOwnerPaymentDescription(input: {
  recipientName: string;
  villaName: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
}): string {
  const guest = input.guestName.trim().toLocaleUpperCase("tr-TR");
  const villa = input.villaName.trim();
  const recipient = input.recipientName.trim();
  return `${recipient}-${villa}-${guest}-${formatOwnerPaymentDate(input.checkIn)}-${formatOwnerPaymentDate(input.checkOut)}  Kiralama Bedeli`;
}

export function buildGuestRefundPaymentDescription(input: {
  guestName: string;
  villaName: string;
  checkIn: Date;
  checkOut: Date;
}): string {
  const guest = input.guestName.trim().toLocaleUpperCase("tr-TR");
  const villa = input.villaName.trim();
  return `${guest}-${villa}-${formatOwnerPaymentDate(input.checkIn)}-${formatOwnerPaymentDate(input.checkOut)}  Misafir İade`;
}

export function checkGuestRefundPaymentMissingFields(input: {
  guestName: string;
  payableAmount: number;
  villaName: string;
}): string[] {
  const missing: string[] = [];
  if (!input.guestName.trim()) missing.push("Misafir adı");
  if (!(input.payableAmount > 0)) missing.push("Ödenecek tutar");
  if (!input.villaName.trim()) missing.push("Villa adı");
  return missing;
}

export function buildGuestRefundPaymentExcelRow(input: {
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  payableAmount: number;
  villaName: string;
}): (string | number)[] {
  const guest = input.guestName.trim();
  const amount = Math.round(input.payableAmount);
  const description = buildGuestRefundPaymentDescription({
    guestName: guest,
    villaName: input.villaName,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });
  return [guest, "", amount, description];
}

export function checkOwnerPaymentMissingFields(
  input: OwnerPaymentExportInput
): string[] {
  const missing: string[] = [];
  if (!input.owner) {
    missing.push("Villa sahibi tanımlı değil");
    return missing;
  }

  const recipient = resolveOwnerPaymentRecipientName(input.owner);
  if (!recipient) missing.push("Alıcı adı / ünvan");

  const iban = normalizeOwnerIban(input.owner.bankIban);
  if (!iban) missing.push("IBAN");
  else if (!/^TR\d{24}$/i.test(iban)) missing.push("IBAN formatı");

  if (!(input.payableAmount > 0)) missing.push("Ödenecek tutar");

  if (!input.villaName.trim()) missing.push("Villa adı");
  if (!input.guestName.trim()) missing.push("Misafir adı");

  return missing;
}

export function buildOwnerPaymentExcelRow(
  input: OwnerPaymentExportInput
): (string | number)[] {
  const recipient = resolveOwnerPaymentRecipientName(input.owner);
  const iban = normalizeOwnerIban(input.owner?.bankIban ?? "");
  const amount = Math.round(input.payableAmount);
  const description = buildOwnerPaymentDescription({
    recipientName: recipient,
    villaName: input.villaName,
    guestName: input.guestName,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });

  return [recipient, iban, amount, description];
}

export function buildOwnerPaymentExportFilename(now = new Date()) {
  const stamp = [
    now.getFullYear(),
    pad2(now.getMonth() + 1),
    pad2(now.getDate()),
  ].join("");
  return `ev-sahibi-odemeleri-${stamp}.xlsx`;
}
