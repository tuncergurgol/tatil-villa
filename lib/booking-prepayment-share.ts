export const BOOKING_PREPAYMENT_OPTION_HOURS = [
  1, 2, 3, 4, 5, 6, 9, 12, 15, 18, 24,
] as const;

export type BookingPrepaymentOptionHours =
  (typeof BOOKING_PREPAYMENT_OPTION_HOURS)[number];

export const DEFAULT_BOOKING_PREPAYMENT_OPTION_HOURS: BookingPrepaymentOptionHours = 3;

export type PrepaymentShareChannel = "whatsapp" | "email" | "sms";

export function formatPrepaymentOptionLabel(hours: number): string {
  return `${hours} Saat`;
}

export function getPrepaymentShareChannelLabel(
  channel: PrepaymentShareChannel
): string {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "E-posta";
    case "sms":
      return "SMS";
  }
}
