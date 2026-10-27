"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Info, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  buildForeignCurrencyPaymentDisclaimer,
  convertCurrencyAmount,
  resolveForeignPriceCurrencies,
  type PublicExchangeRates,
} from "@/lib/currency-conversion";
import { localeToBcp47 } from "@/lib/i18n/locale-display";
import type { VillaPeriodCurrency } from "@/lib/villa-period-pricing";
import { VILLA_PERIOD_CURRENCIES } from "@/lib/villa-period-pricing";

export type PeriodPriceItem = {
  id: string;
  startDate: string;
  endDate: string;
  /** Liste / dönem gecelik fiyatı (indirim öncesi). */
  nightlyPrice: number;
  /** İndirimli gecelik; yoksa veya listeyle aynıysa tek fiyat gösterilir. */
  discountedNightlyPrice?: number | null;
  currency: VillaPeriodCurrency | string;
  minStayNights: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency | string;
  cleaningDayCount: number | null;
};

type PeriodPricesModalProps = {
  periods: PeriodPriceItem[];
  exchangeRates: PublicExchangeRates;
  open: boolean;
  onClose: () => void;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  TL: "₺",
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function utcParts(iso: string) {
  const d = new Date(iso);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}

function formatLongDay(iso: string, withYear: boolean, locale: string) {
  const { year, month, day } = utcParts(iso);
  const date = new Date(Date.UTC(year, month, day));
  return new Intl.DateTimeFormat(localeToBcp47(locale), {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(date);
}

function formatLongRange(startIso: string, endIso: string, locale: string) {
  const start = utcParts(startIso);
  const end = utcParts(endIso);
  const sameYear = start.year === end.year;
  return `${formatLongDay(startIso, !sameYear, locale)} - ${formatLongDay(endIso, true, locale)}`;
}

function formatMoney(amount: number, currency: string, locale: string) {
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  const value = amount.toLocaleString(localeToBcp47(locale), {
    maximumFractionDigits: 0,
  });
  if (symbol === "₺" || symbol === "€" || symbol === "$" || symbol === "£") {
    return `${symbol}${value}`;
  }
  return `${value} ${currency}`;
}

function todayUtcKey() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function periodEndKey(endIso: string) {
  const end = utcParts(endIso);
  return Date.UTC(end.year, end.month, end.day);
}

function periodContainsToday(startIso: string, endIso: string) {
  const start = utcParts(startIso);
  const startKey = Date.UTC(start.year, start.month, start.day);
  const endKey = periodEndKey(endIso);
  const today = todayUtcKey();
  return today >= startKey && today <= endKey;
}

/** Bugün ve sonrası — geçmiş dönemler elenir; içinde bulunulan dönem dahil */
export function filterCurrentAndFuturePeriods(
  periods: PeriodPriceItem[]
): PeriodPriceItem[] {
  const today = todayUtcKey();
  return [...periods]
    .filter((period) => periodEndKey(period.endDate) >= today)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
}

export default function PeriodPricesModal({
  periods,
  exchangeRates,
  open,
  onClose,
}: PeriodPricesModalProps) {
  const locale = useLocale();
  const t = useTranslations("villa");
  const [currency, setCurrency] = useState<VillaPeriodCurrency>("TL");
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  function cleaningTooltip(period: PeriodPriceItem) {
    if (
      period.cleaningFee == null ||
      period.cleaningFee <= 0 ||
      period.cleaningDayCount == null ||
      period.cleaningDayCount <= 0
    ) {
      return null;
    }
    const fee = formatMoney(
      period.cleaningFee,
      period.cleaningFeeCurrency || "TL",
      locale
    );
    return t("cleaningFeeNote", {
      nights: period.cleaningDayCount,
      fee,
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const sorted = useMemo(
    () => filterCurrentAndFuturePeriods(periods),
    [periods]
  );

  const foreignCurrencyDisclaimer = useMemo(
    () =>
      buildForeignCurrencyPaymentDisclaimer(
        resolveForeignPriceCurrencies(sorted.map((period) => period.currency)),
        locale
      ),
    [sorted, locale]
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="period-prices-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 bg-rose-600 px-4 py-4 text-white sm:px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="period-prices-title"
              className="text-lg font-bold tracking-tight"
            >
              {t("periodPrices")}
            </h2>
            <p className="mt-0.5 text-sm text-rose-100">
              {t("periodsAvailable", { count: sorted.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-rose-800/40 p-2 text-white transition hover:bg-rose-800/70"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex shrink-0 items-end justify-between border-b border-slate-200 px-4 pt-2 sm:px-5">
          <div className="flex gap-1">
            {VILLA_PERIOD_CURRENCIES.map((code) => {
              const active = currency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={`relative px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {code}
                  {active ? (
                    <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-slate-300" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="pb-2.5 text-sm font-medium text-slate-500">
            {t("nightly")}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-3 sm:px-4 sm:py-4">
          {sorted.length === 0 ? (
            <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-500">
              {t("noCurrentPeriods")}
            </p>
          ) : null}
          {sorted.map((period) => {
            const active = periodContainsToday(
              period.startDate,
              period.endDate
            );
            const tip = cleaningTooltip(period);
            const listPrice = convertCurrencyAmount(
              period.nightlyPrice,
              period.currency,
              currency,
              exchangeRates
            );
            const saleRaw =
              period.discountedNightlyPrice != null &&
              period.discountedNightlyPrice > 0 &&
              period.discountedNightlyPrice < period.nightlyPrice
                ? period.discountedNightlyPrice
                : null;
            const salePrice =
              saleRaw != null
                ? convertCurrencyAmount(
                    saleRaw,
                    period.currency,
                    currency,
                    exchangeRates
                  )
                : null;
            const showTip = tooltipId === period.id;

            return (
              <article
                key={period.id}
                className={`relative flex rounded-xl border bg-white shadow-sm ${
                  active ? "border-teal-200" : "border-slate-100"
                }`}
              >
                <span
                  className={`w-1.5 shrink-0 rounded-l-xl ${
                    active ? "bg-teal-500" : "bg-rose-500"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 px-3.5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold leading-snug text-slate-800">
                        {formatLongRange(
                          period.startDate,
                          period.endDate,
                          locale
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                        <span>
                          {period.minStayNights
                            ? t("minStayNights", {
                                nights: period.minStayNights,
                              })
                            : t("minStayUnspecified")}
                        </span>
                        {tip ? (
                          <button
                            type="button"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white"
                            aria-label={t("cleaningFeeInfo")}
                            aria-expanded={showTip}
                            onClick={() =>
                              setTooltipId((current) =>
                                current === period.id ? null : period.id
                              )
                            }
                          >
                            i
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {salePrice != null ? (
                        <>
                          <p className="text-sm font-semibold tabular-nums text-rose-500 line-through">
                            {formatMoney(listPrice, currency, locale)}
                          </p>
                          <p
                            className={`text-base font-bold tabular-nums sm:text-lg ${
                              active ? "text-teal-600" : "text-slate-800"
                            }`}
                          >
                            {formatMoney(salePrice, currency, locale)}
                          </p>
                        </>
                      ) : (
                        <p
                          className={`text-base font-bold tabular-nums sm:text-lg ${
                            active ? "text-teal-600" : "text-slate-800"
                          }`}
                        >
                          {formatMoney(listPrice, currency, locale)}
                        </p>
                      )}
                    </div>
                  </div>
                  {showTip && tip ? (
                    <p className="mt-2 rounded-lg bg-slate-700 px-2.5 py-2 text-[11px] leading-snug text-white">
                      {tip}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <footer className="shrink-0 space-y-1.5 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {t("pricesShownNightly")}
          </p>
          {foreignCurrencyDisclaimer ? (
            <p className="text-center text-[11px] font-medium leading-snug text-amber-800">
              {foreignCurrencyDisclaimer}
            </p>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body
  );
}
