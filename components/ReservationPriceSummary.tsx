"use client";

import type { StayQuote } from "@/lib/stay-quote";
import PriceInfoTip from "@/components/PriceInfoTip";
import {
  STAY_OPTIONAL_FEE_OPTIONS,
  STAY_PERIOD_POOL_OPTIONAL_FEE_KEYS,
  STAY_PER_NIGHT_FEE_KEYS,
  computeStayExtrasTotal,
  formatExtraBedFeeBreakdown,
  formatPoolHeatingBreakdown,
  positiveFee,
  resolveExtraBedFeeAmount,
  resolveOptionalFeeAmount,
  resolveOverCapacityGuests,
  resolvePoolHeatingStayAmount,
  shouldUsePeriodPoolOptionalFees,
  type HeatedPoolOption,
  type PoolHeatingSelections,
  type StayFeeSelections,
  type StayOptionalFeeKey,
  type StayPeriodFees,
} from "@/lib/stay-period-fees";

function formatMoneyTl(value: number, currency = "TL"): string {
  const amount = value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  if (currency === "TL" || currency === "TRY") return `${amount} TL`;
  return `${amount} ${currency}`;
}

function formatMoneyTip(value: number, currency = "TL"): string {
  const amount = value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  if (currency === "TL" || currency === "TRY") return `${amount} ₺`;
  return `${amount} ${currency}`;
}

function formatNightDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}

type ReservationPriceSummaryProps = {
  quote: StayQuote | null;
  fees?: StayPeriodFees | null;
  pets?: number;
  adults?: number;
  children?: number;
  baseCapacity?: number;
  checkIn?: string | null;
  checkOut?: string | null;
  heatedPools?: HeatedPoolOption[];
  selections?: StayFeeSelections;
  poolHeatingSelections?: PoolHeatingSelections;
  onSelectionChange?: (key: keyof StayFeeSelections, value: boolean) => void;
  onPoolHeatingChange?: (poolId: string, value: boolean) => void;
  className?: string;
};

function FeeRow({
  label,
  amount,
  currency,
  tip,
}: {
  label: string;
  amount: number;
  currency: string;
  tip?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
        <span className="truncate">{label}</span>
        {tip}
      </span>
      <span className="shrink-0 font-semibold text-slate-900">
        {formatMoneyTl(amount, currency)}
      </span>
    </div>
  );
}

function SelectableFeeRow({
  label,
  amount,
  tip,
  currency,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  amount: number;
  tip?: React.ReactNode;
  currency: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1.5 transition ${
        checked
          ? "border-emerald-300 bg-emerald-50/70"
          : "border-slate-200 bg-white hover:border-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="inline-flex min-w-0 items-center gap-2 text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="truncate text-[13px] leading-tight">{label}</span>
        {tip ? (
          <span
            className="inline-flex shrink-0"
            onClick={(event) => event.preventDefault()}
          >
            {tip}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-slate-900">
        {formatMoneyTl(amount, currency)}
      </span>
    </label>
  );
}

function emptyFeesFromQuote(quote: StayQuote): StayPeriodFees {
  return {
    cleaningFee: quote.cleaningFee,
    damageDeposit: null,
    petCleaningFee: null,
    petDamageDeposit: null,
    underfloorHeatingFee: null,
    extraBedFee: null,
    poolHeatingPrivateFee: null,
    poolHeatingIndoorFee: null,
    poolHeatingKidsFee: null,
  };
}

/** Public + admin ortak rezervasyon hesaplama özeti */
export default function ReservationPriceSummary({
  quote,
  fees = null,
  pets = 0,
  adults = 2,
  children = 0,
  baseCapacity = 0,
  checkIn = null,
  checkOut = null,
  heatedPools = [],
  selections = {},
  poolHeatingSelections = {},
  onSelectionChange,
  onPoolHeatingChange,
  className = "",
}: ReservationPriceSummaryProps) {
  if (!quote || quote.nights <= 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-200 bg-white/70 px-3.5 py-3 text-sm text-slate-500 ${className}`}
      >
        Tarih seçildiğinde konaklama bedeli hesaplanır.
      </div>
    );
  }

  if (!quote.valid) {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 ${className}`}
      >
        {quote.invalidReason ?? "Bu tarihler için rezervasyon hesaplanamadı."}
        {quote.minStayNights != null ? (
          <p className="mt-1 text-xs text-amber-700">
            Minimum konaklama: {quote.minStayNights} gece
          </p>
        ) : null}
      </div>
    );
  }

  const currency = quote.currency;
  const nights = quote.nights;
  const periodFees = fees ?? emptyFeesFromQuote(quote);
  const overCapacityGuests = resolveOverCapacityGuests(
    adults,
    children,
    baseCapacity
  );
  const extraBedUnit = positiveFee(periodFees.extraBedFee);
  const extraBedTotal = resolveExtraBedFeeAmount({
    overCapacityGuests,
    nights,
    unitFee: extraBedUnit,
  });

  const extrasTotal = computeStayExtrasTotal({
    pets,
    nights,
    adults,
    children,
    baseCapacity,
    fees: periodFees,
    selections,
    heatedPools,
    poolHeatingSelections,
    checkIn,
    checkOut,
  });
  const grandTotal = quote.accommodationTotal + quote.cleaningFee + extrasTotal;
  const prepaymentAmount = Math.round(
    (quote.accommodationTotal * quote.prepaymentRate) / 100
  );
  const checkInPayment = Math.max(0, grandTotal - prepaymentAmount);

  const cleaningAmount = quote.cleaningFee;
  const showCleaningRow =
    cleaningAmount > 0 ||
    (quote.cleaningDayCount != null && quote.cleaningDayCount > 0);
  const petCleaning = pets > 0 ? positiveFee(periodFees.petCleaningFee) : 0;
  const damageDeposit = positiveFee(periodFees.damageDeposit);
  const petDamageDeposit =
    pets > 0 ? positiveFee(periodFees.petDamageDeposit) : 0;

  const selectableOptions = STAY_OPTIONAL_FEE_OPTIONS.filter((option) => {
    if (
      !shouldUsePeriodPoolOptionalFees(heatedPools) &&
      STAY_PERIOD_POOL_OPTIONAL_FEE_KEYS.has(option.key)
    ) {
      return false;
    }
    return positiveFee(periodFees[option.key]) > 0;
  });

  const poolHeatingRows =
    checkIn && checkOut
      ? heatedPools.map((pool) => {
          const pricing = resolvePoolHeatingStayAmount({
            periods: pool.periods,
            checkIn,
            checkOut,
          });
          return { pool, pricing };
        })
      : [];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Rezervasyon Hesabı
      </p>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
            <span className="truncate">Konaklama ({nights} Gece)</span>
            <PriceInfoTip label="Gecelik fiyat kırılımı">
              <span className="block space-y-1 text-left">
                {quote.nightLines.map((line) => (
                  <span
                    key={line.dateKey}
                    className="block border-b border-white/30 pb-1 last:border-b-0 last:pb-0"
                  >
                    {formatNightDate(line.dateKey)} -{" "}
                    <span className="font-bold">
                      {formatMoneyTip(line.price, currency)}
                    </span>
                  </span>
                ))}
              </span>
            </PriceInfoTip>
          </span>
          <span className="shrink-0 font-semibold text-slate-900">
            {formatMoneyTl(quote.accommodationTotal, currency)}
          </span>
        </div>

        {showCleaningRow ? (
          <FeeRow
            label="Temizlik Bedeli"
            amount={cleaningAmount}
            currency={currency}
            tip={
              quote.cleaningDayCount != null && quote.cleaningDayCount > 0 ? (
                <PriceInfoTip label="Temizlik ücreti bilgisi">
                  <span className="block">
                    {quote.cleaningDayCount} gece altında yapılan
                    <br />
                    kiralamalarda temizlik ücreti
                    <br />
                    <span className="font-bold">alınır</span>
                  </span>
                </PriceInfoTip>
              ) : undefined
            }
          />
        ) : null}

        {petCleaning > 0 ? (
          <FeeRow
            label="Evcil Hayvan Temizlik Bedeli"
            amount={petCleaning}
            currency={currency}
          />
        ) : null}

        {extraBedTotal > 0 ? (
          <FeeRow
            label="Ek Yatak Bedeli"
            amount={extraBedTotal}
            currency={currency}
            tip={
              <PriceInfoTip label="Ek yatak bedeli hesabı">
                {formatExtraBedFeeBreakdown({
                  overCapacityGuests,
                  nights,
                  unitFee: extraBedUnit,
                  currency,
                })}
              </PriceInfoTip>
            }
          />
        ) : null}

        {selectableOptions.map((option) => {
          const unit = positiveFee(periodFees[option.key]);
          const amount = resolveOptionalFeeAmount(
            option.key as StayOptionalFeeKey,
            unit,
            nights
          );
          const perNight = STAY_PER_NIGHT_FEE_KEYS.has(
            option.key as StayOptionalFeeKey
          );
          return (
            <SelectableFeeRow
              key={option.key}
              label={option.label}
              amount={amount}
              tip={
                perNight ? (
                  <PriceInfoTip label={`${option.label} hesabı`}>
                    {`${formatMoneyTl(unit, currency)} × ${nights} gece`}
                  </PriceInfoTip>
                ) : undefined
              }
              currency={currency}
              checked={Boolean(selections[option.key])}
              onChange={(value) => onSelectionChange?.(option.key, value)}
            />
          );
        })}

        {poolHeatingRows.map(({ pool, pricing }) => {
          const hasPrice = pricing.total > 0;
          const tipText = hasPrice
            ? formatPoolHeatingBreakdown({
                unitFee: pricing.unitFee,
                nights: pricing.nightsWithFee || nights,
                total: pricing.total,
                currency: pricing.currency || currency,
              })
            : "Bu tarihler için ısıtma periyodu yok";
          return (
            <SelectableFeeRow
              key={pool.id}
              label={`Havuz Isıtma (${pool.name})`}
              amount={pricing.total}
              tip={
                <PriceInfoTip label={`Havuz ısıtma hesabı: ${pool.name}`}>
                  {tipText}
                </PriceInfoTip>
              }
              currency={pricing.currency || currency}
              checked={Boolean(poolHeatingSelections[pool.id])}
              disabled={!hasPrice}
              onChange={(value) => onPoolHeatingChange?.(pool.id, value)}
            />
          );
        })}
      </div>

      <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2.5">
        <div className="flex items-center justify-between gap-2 font-bold text-slate-900">
          <span>Toplam</span>
          <span>{formatMoneyTl(grandTotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>Ön Ödeme (%{quote.prepaymentRate})</span>
          <span>{formatMoneyTl(prepaymentAmount, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>Girişte Ödeme</span>
          <span>{formatMoneyTl(checkInPayment, currency)}</span>
        </div>

        {(damageDeposit > 0 || petDamageDeposit > 0) && (
          <div className="space-y-0.5 pt-1.5 text-[11px] leading-snug text-slate-600">
            {damageDeposit > 0 ? (
              <p>
                <span className="font-medium text-slate-700">
                  Hasar Depozitosu:
                </span>{" "}
                {formatMoneyTl(damageDeposit, currency)}
              </p>
            ) : null}
            {petDamageDeposit > 0 ? (
              <p>
                <span className="font-medium text-slate-700">
                  Evcil Hayvan Hasar Depozitosu:
                </span>{" "}
                {formatMoneyTl(petDamageDeposit, currency)}
              </p>
            ) : null}
            <p className="text-slate-500">
              Girişte alınır, hasar yoksa iade edilir. Toplama dahil değildir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function getReservationGrandTotal(
  quote: StayQuote,
  fees: StayPeriodFees | null | undefined,
  pets: number,
  selections: StayFeeSelections,
  options?: {
    adults?: number;
    children?: number;
    baseCapacity?: number;
    heatedPools?: HeatedPoolOption[];
    poolHeatingSelections?: PoolHeatingSelections;
    checkIn?: string | null;
    checkOut?: string | null;
  }
): {
  extrasTotal: number;
  grandTotal: number;
  prepaymentAmount: number;
  checkInPayment: number;
} {
  const periodFees = fees ?? emptyFeesFromQuote(quote);
  const adults = options?.adults ?? 2;
  const children = options?.children ?? 0;
  const baseCapacity = options?.baseCapacity ?? 0;
  const extrasTotal = computeStayExtrasTotal({
    pets,
    nights: quote.nights,
    adults,
    children,
    baseCapacity,
    fees: periodFees,
    selections,
    heatedPools: options?.heatedPools,
    poolHeatingSelections: options?.poolHeatingSelections,
    checkIn: options?.checkIn,
    checkOut: options?.checkOut,
  });
  const grandTotal = quote.accommodationTotal + quote.cleaningFee + extrasTotal;
  const prepaymentAmount = Math.round(
    (quote.accommodationTotal * quote.prepaymentRate) / 100
  );
  return {
    extrasTotal,
    grandTotal,
    prepaymentAmount,
    checkInPayment: Math.max(0, grandTotal - prepaymentAmount),
  };
}
