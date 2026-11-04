/**
 * Villa dönem ön ödeme / komisyon oranları.
 * Dış siteden kurulum ve scrape sonrası boş kalmamalı.
 */

export const DEFAULT_VILLA_PERIOD_COMMISSION_RATE = 20;

/** HILL VILLAS ilanlarında ön ödeme bu oranda sabit kalır. */
export const HILL_VILLAS_PREPAYMENT_RATE = 35;

export function isHillVillasListing(
  input: { name?: string | null; originalName?: string | null } | null | undefined
): boolean {
  if (!input) return false;
  const text = `${input.originalName ?? ""} ${input.name ?? ""}`.toLocaleUpperCase(
    "tr-TR"
  );
  return text.includes("HILL VILLAS");
}

export function fixedPrepaymentRateForListing(
  input: { name?: string | null; originalName?: string | null } | null | undefined
): number | null {
  return isHillVillasListing(input) ? HILL_VILLAS_PREPAYMENT_RATE : null;
}

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
>(
  period: T
): Omit<T, "prepaymentRate" | "commissionRate"> & {
  prepaymentRate: number;
  commissionRate: number;
} {
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
>(
  period: T
): Omit<T, "prepaymentRate" | "commissionRate"> & {
  prepaymentRate: number;
  commissionRate: number;
} {
  const filled = fillMissingVillaPeriodPaymentRates(period);
  return {
    ...filled,
    prepaymentRate: filled.commissionRate,
  };
}
