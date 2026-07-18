import type { VillaPeriodCurrency } from "@/lib/villa-period-pricing";

export const EXCHANGE_RATE_MARGIN = 1.01;

export type PublicExchangeRates = {
  /** 1 birim dövizin TL karşılığı; %1 fiyat marjı uygulanmış satış kuru. */
  TL: 1;
  EUR: number;
  USD: number;
  GBP: number;
  source: "TCMB" | "GARANTI_BBVA";
  publishedAt: string;
};

export function normalizeCurrency(
  currency: VillaPeriodCurrency | string | null | undefined
): VillaPeriodCurrency {
  const value = String(currency ?? "TL").toUpperCase();
  if (value === "TRY") return "TL";
  if (value === "EUR" || value === "USD" || value === "GBP") return value;
  return "TL";
}

export function convertCurrencyAmount(
  amount: number | null | undefined,
  fromCurrency: VillaPeriodCurrency | string | null | undefined,
  toCurrency: VillaPeriodCurrency | string | null | undefined,
  rates: PublicExchangeRates
): number {
  if (amount == null || !Number.isFinite(amount)) return 0;

  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return Math.round(amount);

  const amountInTl = from === "TL" ? amount : amount * rates[from];
  const converted = to === "TL" ? amountInTl : amountInTl / rates[to];
  return Math.round(converted);
}

export function convertNullableCurrencyAmount(
  amount: number | null | undefined,
  fromCurrency: VillaPeriodCurrency | string | null | undefined,
  toCurrency: VillaPeriodCurrency | string | null | undefined,
  rates: PublicExchangeRates
): number | null {
  if (amount == null) return null;
  return convertCurrencyAmount(amount, fromCurrency, toCurrency, rates);
}
