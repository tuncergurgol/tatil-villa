"use client";

import type { StayQuote } from "@/lib/stay-quote";
import PriceInfoTip from "@/components/PriceInfoTip";
import {
  STAY_OPTIONAL_FEE_OPTIONS,
  STAY_PER_NIGHT_FEE_KEYS,
  computeStayExtrasTotal,
  formatExtraBedFeeBreakdown,
  positiveFee,
  resolveExtraBedFeeAmount,
  resolveOptionalFeeAmount,
  resolveOverCapacityGuests,
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
  selections?: StayFeeSelections;
  onSelectionChange?: (key: keyof StayFeeSelections, value: boolean) => void;
  className?: string;
};

function FeeRow({
  label,
  amount,
  currency,
  tip,
  breakdown,
}: {
  label: string;
  amount: number;
  currency: string;
  tip?: React.ReactNode;
  breakdown?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="inline-flex min-w-0 flex-col gap-0.5 text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {tip}
        </span>
        {breakdown ? (
          <span className="text-[11px] text-slate-500">{breakdown}</span>
        ) : null}
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
  unitHint,
  currency,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  amount: number;
  unitHint?: string;
  currency: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-2.5 py-2 transition ${
        checked
          ? "border-emerald-300 bg-emerald-50/70"
          : "border-slate-200 bg-white hover:border-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="inline-flex min-w-0 flex-col gap-0.5 text-slate-700">
        <span className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>{label}</span>
        </span>
        {unitHint ? (
          <span className="pl-6 text-[11px] text-slate-500">{unitHint}</span>
        ) : null}
      </span>
      <span className="shrink-0 font-semibold text-slate-900">
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
  selections = {},
  onSelectionChange,
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

  const selectableOptions = STAY_OPTIONAL_FEE_OPTIONS.filter(
    (option) => positiveFee(periodFees[option.key]) > 0
  );

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm shadow-sm ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Rezervasyon Hesabı
      </p>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            Konaklama ({nights} Gece)
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
          <span className="font-semibold text-slate-900">
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
                    {quote.cleaningDayCount} günü altında yapılan
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
              unitHint={
                perNight
                  ? `${formatMoneyTl(unit, currency)} × ${nights} gece`
                  : undefined
              }
              currency={currency}
              checked={Boolean(selections[option.key])}
              onChange={(value) => onSelectionChange?.(option.key, value)}
            />
          );
        })}

        {extraBedTotal > 0 ? (
          <FeeRow
            label="Ek Yatak Ücreti"
            amount={extraBedTotal}
            currency={currency}
            breakdown={formatExtraBedFeeBreakdown({
              overCapacityGuests,
              nights,
              unitFee: extraBedUnit,
              currency,
            })}
          />
        ) : null}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-3 font-bold text-slate-900">
          <span>Toplam</span>
          <span>{formatMoneyTl(grandTotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Ön Ödeme (%{quote.prepaymentRate})</span>
          <span>{formatMoneyTl(prepaymentAmount, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Girişte Ödeme</span>
          <span>{formatMoneyTl(checkInPayment, currency)}</span>
        </div>

        {damageDeposit > 0 ? (
          <p className="pt-2 text-xs leading-relaxed text-slate-600">
            <span className="font-medium text-slate-700">Hasar Depozitosu:</span>{" "}
            {formatMoneyTl(damageDeposit, currency)}
          </p>
        ) : null}

        {petDamageDeposit > 0 ? (
          <p className="text-xs leading-relaxed text-slate-600">
            <span className="font-medium text-slate-700">
              Evcil Hayvan Hasar Depozitosu:
            </span>{" "}
            {formatMoneyTl(petDamageDeposit, currency)}
          </p>
        ) : null}

        {damageDeposit + petDamageDeposit > 0 ? (
          <p className="pt-1 text-[11px] leading-relaxed text-slate-500">
            Girişte alınır, çıkış kontrolünde hasar yoksa iade edilir. Toplama
            dahil değildir.
          </p>
        ) : null}
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
