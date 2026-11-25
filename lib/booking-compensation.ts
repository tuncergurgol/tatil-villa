/**
 * Tazminat tutar dağılımı:
 * - Komisyon = tazminat
 * - Misafire iade verilmezse varsayılan = ön ödeme − komisyon farkı
 * - Villa sahibine ödeme = ön ödeme − komisyon − misafire iade
 */
export type CompensationBreakdown = {
  reservationTotal: number;
  prepaymentTotal: number;
  compensationAmount: number;
  commissionAmount: number;
  difference: number;
  guestRefundAmount: number;
  ownerPayableAmount: number;
};

function toNonNegativeInt(value: number | null | undefined): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function computeCompensationBreakdown(input: {
  reservationTotal: number | null | undefined;
  prepaymentTotal: number | null | undefined;
  compensationAmount: number | null | undefined;
  /** `undefined` = varsayılan (tüm fark misafire). `0` geçerli manuel değerdir. */
  guestRefundAmount?: number | undefined;
}): CompensationBreakdown {
  const reservationTotal = toNonNegativeInt(input.reservationTotal);
  const prepaymentTotal = toNonNegativeInt(input.prepaymentTotal);
  const compensationAmount = toNonNegativeInt(
    input.compensationAmount == null
      ? prepaymentTotal
      : input.compensationAmount
  );
  const commissionAmount = compensationAmount;
  const difference = Math.max(0, prepaymentTotal - commissionAmount);

  const requestedRefund =
    input.guestRefundAmount === undefined
      ? difference
      : toNonNegativeInt(input.guestRefundAmount);
  const guestRefundAmount = Math.min(difference, requestedRefund);
  const ownerPayableAmount = Math.max(
    0,
    prepaymentTotal - commissionAmount - guestRefundAmount
  );

  return {
    reservationTotal,
    prepaymentTotal,
    compensationAmount,
    commissionAmount,
    difference,
    guestRefundAmount,
    ownerPayableAmount,
  };
}
