/**
 * Smoke: villa dönem ön ödeme / komisyon boş kalmaz.
 * Çalıştır: npx tsx scripts/smoke-villa-period-payment-rates.ts
 */
import assert from "node:assert/strict";
import {
  alignVillaPeriodPrepaymentToCommission,
  DEFAULT_VILLA_PERIOD_COMMISSION_RATE,
  fillMissingVillaPeriodPaymentRates,
} from "../lib/villa-period-payment-rates";

assert.equal(DEFAULT_VILLA_PERIOD_COMMISSION_RATE, 20);

const filledEmpty = fillMissingVillaPeriodPaymentRates({
  prepaymentRate: null,
  commissionRate: null,
});
assert.equal(filledEmpty.commissionRate, 20);
assert.equal(filledEmpty.prepaymentRate, 20);

const filledCommissionOnly = fillMissingVillaPeriodPaymentRates({
  prepaymentRate: null,
  commissionRate: 15,
});
assert.equal(filledCommissionOnly.commissionRate, 15);
assert.equal(filledCommissionOnly.prepaymentRate, 15);

const keepBoth = fillMissingVillaPeriodPaymentRates({
  prepaymentRate: 25,
  commissionRate: 15,
});
assert.equal(keepBoth.commissionRate, 15);
assert.equal(keepBoth.prepaymentRate, 25);

const aligned = alignVillaPeriodPrepaymentToCommission({
  prepaymentRate: 25,
  commissionRate: 15,
});
assert.equal(aligned.commissionRate, 15);
assert.equal(aligned.prepaymentRate, 15);

const alignedEmpty = alignVillaPeriodPrepaymentToCommission({
  prepaymentRate: null,
  commissionRate: null,
});
assert.equal(alignedEmpty.commissionRate, 20);
assert.equal(alignedEmpty.prepaymentRate, 20);

console.log("smoke-villa-period-payment-rates: OK");
