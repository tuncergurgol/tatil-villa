/**
 * Tazminat tutar dağılımı:
 * - Komisyon = tazminat
 * - Fark (ön ödeme − tazminat) varsayılan olarak misafire iade
 * - Misafir iadesi düşürülürse kalan villa sahibine ödeme
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

export function computeCompensationBreakdown(input: {
  reservationTotal: number | null | undefined;
  prepaymentTotal: number | null | undefined;
  compensationAmount: number | null | undefined;
  guestRefundAmount?: number | null | undefined;
}): CompensationBreakdown {
  const reservationTotal = Math.max(
    0,
    Math.round(Number(input.reservationTotal) || 0)
  );
  const prepaymentTotal = Math.max(
    0,
    Math.round(Number(input.prepaymentTotal) || 0)
  );
  const compensationAmount = Math.max(
    0,
    Math.round(
      Number(
        input.compensationAmount == null
          ? prepaymentTotal
          : input.compensationAmount
      ) || 0
    )
  );
  const difference = Math.max(0, prepaymentTotal - compensationAmount);
  const requestedRefund =
    input.guestRefundAmount == null
      ? difference
      : Math.max(0, Math.round(Number(input.guestRefundAmount) || 0));
  const guestRefundAmount = Math.min(difference, requestedRefund);
  const ownerPayableAmount = Math.max(0, difference - guestRefundAmount);

  return {
    reservationTotal,
    prepaymentTotal,
    compensationAmount,
    commissionAmount: compensationAmount,
    difference,
    guestRefundAmount,
    ownerPayableAmount,
  };
}
