/**
 * Villa dönem ön ödeme / komisyon oranları.
 * Dış siteden kurulum ve scrape sonrası boş kalmamalı.
 */

export const DEFAULT_VILLA_PERIOD_COMMISSION_RATE = 20;

function positiveRate(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/**
 * Komisyon boşsa %20; ön ödeme boşsa komisyona eşitlenir.
 * İkisi de asla boş/null kalmaz.
 */
export function fillMissingVillaPeriodPaymentRates<
  T extends {
    prepaymentRate?: number | null;
    commissionRate?: number | null;
  },
>(period: T): T & { prepaymentRate: number; commissionRate: number } {
  const commissionRate =
    positiveRate(period.commissionRate) ?? DEFAULT_VILLA_PERIOD_COMMISSION_RATE;
  const prepaymentRate =
    positiveRate(period.prepaymentRate) ?? commissionRate;
  return {
    ...period,
    commissionRate,
    prepaymentRate,
  };
}

/**
 * Dış siteden kurulum: ön ödeme oranı = komisyon oranı.
 */
export function alignVillaPeriodPrepaymentToCommission<
  T extends {
    prepaymentRate?: number | null;
    commissionRate?: number | null;
  },
>(period: T): T & { prepaymentRate: number; commissionRate: number } {
  const filled = fillMissingVillaPeriodPaymentRates(period);
  return {
    ...filled,
    prepaymentRate: filled.commissionRate,
  };
}
