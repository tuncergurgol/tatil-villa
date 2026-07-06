export const BOOKING_PREPAYMENT_OPTION_HOURS = [
  1, 2, 3, 4, 5, 6, 9, 12, 15, 18, 24,
] as const;

export type BookingPrepaymentOptionHours =
  (typeof BOOKING_PREPAYMENT_OPTION_HOURS)[number];

export type PrepaymentShareChannel = "whatsapp" | "email";

export function formatPrepaymentOptionLabel(hours: number): string {
  return `${hours} Saat`;
}

export function buildPrepaymentShareMessage(input: {
  reservationCode: string;
  guestName: string;
  prepaymentAmount: number;
  paymentChannel: string;
  optionHours: number;
}): string {
  return [
    `${input.reservationCode} nolu rezervasyon için ön ödeme bilgisi`,
    `Sayın ${input.guestName},`,
    `Ön Ödeme Tutarı: ${input.prepaymentAmount.toLocaleString("tr-TR")} TL`,
    `Ödeme Kanalı: ${input.paymentChannel}`,
    `Opsiyon Süresi: ${formatPrepaymentOptionLabel(input.optionHours)}`,
    "",
    "Mesaj şablonları sisteme eklenecektir.",
  ].join("\n");
}
