/**
 * Rezervasyon iptal nedenleri ve mücbir sebep iade kuralları.
 */

export const BOOKING_CANCELLATION_REASONS = [
  {
    id: "customer_withdraw",
    group: "customer",
    label: "Talepten vazgeçme",
    fullLabel: "Müşteri İptali — Talepten vazgeçme",
  },
  {
    id: "customer_force_majeure",
    group: "customer",
    label: "Mücbir Sebep İptali",
    fullLabel: "Müşteri İptali — Mücbir Sebep İptali",
  },
  {
    id: "calendar_full",
    group: "calendar",
    label: "Takvimi Dolu",
    fullLabel: "Takvimi Dolu",
  },
  {
    id: "agency",
    group: "agency",
    label: "Acente İptali",
    fullLabel: "Acente İptali",
  },
  {
    id: "owner",
    group: "owner",
    label: "Ev Sahibi İptali",
    fullLabel: "Ev Sahibi İptali",
  },
] as const;

export type BookingCancellationReasonId =
  (typeof BOOKING_CANCELLATION_REASONS)[number]["id"];

export type ForceMajeureRefundRecipient = "guest" | "owner";

export function isBookingCancellationReasonId(
  value: string
): value is BookingCancellationReasonId {
  return BOOKING_CANCELLATION_REASONS.some((item) => item.id === value);
}

export function getCancellationReasonLabel(
  reasonId: BookingCancellationReasonId | string | null | undefined
): string {
  if (!reasonId) return "";
  const found = BOOKING_CANCELLATION_REASONS.find(
    (item) => item.id === reasonId
  );
  return found?.fullLabel ?? reasonId;
}

/** Mücbir sebep iadesinde alıcı: yalnızca “Mücbir Sebep İptali” → misafir. */
export function resolveForceMajeureRefundRecipient(
  reasonId: BookingCancellationReasonId
): ForceMajeureRefundRecipient {
  return reasonId === "customer_force_majeure" ? "guest" : "owner";
}

export function getForceMajeureRecipientLabel(
  recipient: ForceMajeureRefundRecipient
): string {
  return recipient === "guest" ? "Misafir" : "Villa Sahibi";
}
