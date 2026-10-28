"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePublicExchangeRates } from "@/components/PublicExchangeRatesProvider";
import { convertCurrencyAmount } from "@/lib/currency-conversion";
import {
  currencySymbol,
  preferredDisplayCurrency,
} from "@/lib/i18n/display-currency";
import { localeToBcp47 } from "@/lib/i18n/locale-display";

type VillaPriceRangeProps = {
  minNightlyPrice?: number | null;
  maxNightlyPrice?: number | null;
  pricePerNight?: number | null;
  showArrow?: boolean;
  compact?: boolean;
};

export default function VillaPriceRange({
  minNightlyPrice,
  maxNightlyPrice,
  pricePerNight,
  showArrow = true,
  compact = false,
}: VillaPriceRangeProps) {
  const locale = useLocale();
  const tChrome = useTranslations("chrome");
  const bcp47 = localeToBcp47(locale);
  const exchangeRates = usePublicExchangeRates();
  const displayCurrency = preferredDisplayCurrency(locale);

  function formatRangeAmount(price: number) {
    if (exchangeRates && displayCurrency !== "TL") {
      const converted = convertCurrencyAmount(
        price,
        "TL",
        displayCurrency,
        exchangeRates
      );
      const symbol = currencySymbol(displayCurrency);
      return `≈ ${symbol}${converted.toLocaleString(bcp47, { maximumFractionDigits: 0 })}`;
    }
    return `${price.toLocaleString(bcp47, { maximumFractionDigits: 0 })}TL`;
  }

  const min = minNightlyPrice ?? pricePerNight ?? null;
  const max = maxNightlyPrice ?? pricePerNight ?? null;

  if (min == null || max == null) {
    return (
      <div className="flex w-full items-end justify-between gap-2">
        <p
          className={`font-semibold text-amber-700 ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {tChrome("requestQuote")}
        </p>
        {showArrow ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-700 text-lg font-semibold text-white shadow-sm transition group-hover:bg-orange-800">
            →
          </span>
        ) : null}
      </div>
    );
  }

  const same = min === max;
  const rangeText = same
    ? formatRangeAmount(min)
    : `${formatRangeAmount(min)} - ${formatRangeAmount(max)}`;

  return (
    <div className="flex w-full items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="leading-tight">
          <span
            className={`font-bold text-slate-800 ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {rangeText}
          </span>
          <span className="ml-1 align-top text-[11px] font-semibold text-orange-700">
            {tChrome("perNight")}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {same ? tChrome("nightlyPrice") : tChrome("inPriceRange")}
        </p>
      </div>
      {showArrow ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-700 text-lg font-semibold text-white shadow-sm transition group-hover:bg-orange-800 group-hover:shadow-md">
          →
        </span>
      ) : null}
    </div>
  );
}
