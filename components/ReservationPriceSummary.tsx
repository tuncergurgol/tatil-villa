"use client";

import type { StayQuote } from "@/lib/stay-quote";
import PriceInfoTip from "@/components/PriceInfoTip";
import {
  STAY_EXTRA_BED_OPTION,
  STAY_OPTIONAL_FEE_OPTIONS,
  computeStayExtrasTotal,
  positiveFee,
  type StayFeeSelections,
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
  selections?: StayFeeSelections;
  onSelectionChange?: (key: keyof StayFeeSelections, value: boolean) => void;
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
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        {label}
        {tip}
      </span>
      <span className="font-semibold text-slate-900">
        {formatMoneyTl(amount, currency)}
      </span>
    </div>
  );
}

function SelectableFeeRow({
  label,
  amount,
  currency,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  amount: number;
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
      <span className="inline-flex items-center gap-2 text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        {label}
      </span>
      <span className="font-semibold text-slate-900">
        {formatMoneyTl(amount, currency)}
      </span>
    </label>
  );
}

/** Public + admin ortak rezervasyon hesaplama özeti */
export default function ReservationPriceSummary({
  quote,
  fees = null,
  pets = 0,
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
  const periodFees = fees ?? {
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

  const extrasTotal = computeStayExtrasTotal({
    pets,
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

  const selectableOptions = [
    ...STAY_OPTIONAL_FEE_OPTIONS,
    ...(positiveFee(periodFees.extraBedFee) > 0 ? [STAY_EXTRA_BED_OPTION] : []),
  ].filter((option) => positiveFee(periodFees[option.key]) > 0);

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
            Konaklama ({quote.nights} Gece)
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

        {damageDeposit > 0 ? (
          <FeeRow
            label="Hasar Depozitosu"
            amount={damageDeposit}
            currency={currency}
            tip={
              <PriceInfoTip label="Hasar depozitosu">
                <span className="block">
                  Girişte alınır, hasar yoksa iade edilir.
                  <br />
                  Toplam konaklama bedeline dahil değildir.
                </span>
              </PriceInfoTip>
            }
          />
        ) : null}

        {petDamageDeposit > 0 ? (
          <FeeRow
            label="Evcil Hayvan Hasar Depozitosu"
            amount={petDamageDeposit}
            currency={currency}
            tip={
              <PriceInfoTip label="Evcil hayvan hasar depozitosu">
                <span className="block">
                  Evcil hayvanlı konaklamalarda alınır.
                  <br />
                  Toplam konaklama bedeline dahil değildir.
                </span>
              </PriceInfoTip>
            }
          />
        ) : null}
      </div>

      {selectableOptions.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ek Hizmetler
          </p>
          {selectableOptions.map((option) => {
            const amount = positiveFee(periodFees[option.key]);
            return (
              <SelectableFeeRow
                key={option.key}
                label={option.label}
                amount={amount}
                currency={currency}
                checked={Boolean(selections[option.key])}
                onChange={(value) => onSelectionChange?.(option.key, value)}
              />
            );
          })}
        </div>
      ) : null}

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
        {damageDeposit + petDamageDeposit > 0 ? (
          <p className="pt-1 text-[11px] text-slate-500">
            Depozito girişi:{" "}
            {formatMoneyTl(damageDeposit + petDamageDeposit, currency)} (toplama
            dahil değil)
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
  selections: StayFeeSelections
): {
  extrasTotal: number;
  grandTotal: number;
  prepaymentAmount: number;
  checkInPayment: number;
} {
  const periodFees = fees ?? {
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
  const extrasTotal = computeStayExtrasTotal({
    pets,
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
