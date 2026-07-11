"use client";

import type { StayQuote } from "@/lib/stay-quote";
import PriceInfoTip from "@/components/PriceInfoTip";

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
  className?: string;
};

/** Public + admin ortak rezervasyon hesaplama özeti */
export default function ReservationPriceSummary({
  quote,
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

  const showCleaningRow =
    quote.cleaningFee > 0 ||
    (quote.cleaningDayCount != null && quote.cleaningDayCount > 0);

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
                      {formatMoneyTip(line.price, quote.currency)}
                    </span>
                  </span>
                ))}
              </span>
            </PriceInfoTip>
          </span>
          <span className="font-semibold text-slate-900">
            {formatMoneyTl(quote.accommodationTotal, quote.currency)}
          </span>
        </div>

        {showCleaningRow ? (
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              Temizlik Ücreti
              {quote.cleaningDayCount != null && quote.cleaningDayCount > 0 ? (
                <PriceInfoTip label="Temizlik ücreti bilgisi">
                  <span className="block">
                    {quote.cleaningDayCount} günü altında yapılan
                    <br />
                    kiralamalarda temizlik ücreti
                    <br />
                    <span className="font-bold">alınır</span>
                  </span>
                </PriceInfoTip>
              ) : null}
            </span>
            <span className="font-semibold text-slate-900">
              {formatMoneyTl(quote.cleaningFee, quote.currency)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-3 font-bold text-slate-900">
          <span>Toplam</span>
          <span>{formatMoneyTl(quote.total, quote.currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Ön Ödeme (%{quote.prepaymentRate})</span>
          <span>{formatMoneyTl(quote.prepaymentAmount, quote.currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Girişte Ödeme</span>
          <span>{formatMoneyTl(quote.checkInPayment, quote.currency)}</span>
        </div>
      </div>
    </div>
  );
}
