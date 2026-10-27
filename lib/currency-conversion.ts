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

/** Periyotlarda geçen TL dışı para birimleri (EUR → USD → GBP sırası). */
export function resolveForeignPriceCurrencies(
  currencies: Array<VillaPeriodCurrency | string | null | undefined>
): Exclude<VillaPeriodCurrency, "TL">[] {
  const found = new Set<Exclude<VillaPeriodCurrency, "TL">>();
  for (const currency of currencies) {
    const normalized = normalizeCurrency(currency);
    if (normalized !== "TL") found.add(normalized);
  }
  return (["EUR", "USD", "GBP"] as const).filter((code) => found.has(code));
}

export function buildForeignCurrencyPaymentDisclaimer(
  foreignCurrencies: Exclude<VillaPeriodCurrency, "TL">[],
  locale: string = "tr"
): string | null {
  if (foreignCurrencies.length === 0) return null;
  const label = foreignCurrencies.join(" / ");
  switch (locale) {
    case "tr":
      return `Gecelik fiyatlar ${label} olarak belirlenmiş, yaptığınız ön ödeme ve girişte yapacağınız ödeme ${label} olarak değerlendirilir. TL para birimi bilgilendirme amaçlıdır.`;
    case "de":
      return `Nachtpreise sind in ${label} festgelegt. Ihre Anzahlung und die Zahlung bei Anreise werden in ${label} berechnet. TL-Beträge dienen nur zur Information.`;
    case "fr":
      return `Les tarifs par nuit sont fixés en ${label}. Votre acompte et le paiement à l'arrivée sont facturés en ${label}. Les montants en TL sont indicatifs.`;
    case "es":
      return `Las tarifas por noche están fijadas en ${label}. Su prepago y el pago a la llegada se cobran en ${label}. Los importes en TL son solo informativos.`;
    case "bg":
      return `Цените за нощ са определени в ${label}. Предплащането и плащането при настаняване са в ${label}. Сумите в TL са само за информация.`;
    case "el":
      return `Οι τιμές ανά διανυκτέρευση ορίζονται σε ${label}. Η προκαταβολή και η πληρωμή κατά την άφιξη χρεώνονται σε ${label}. Τα ποσά σε TL είναι ενδεικτικά.`;
    case "zh":
      return `每晚价格以 ${label} 计价。预付款与入住时付款均按 ${label} 收取。TL 金额仅供参考。`;
    case "ru":
      return `Цены за ночь указаны в ${label}. Предоплата и оплата при заезде взимаются в ${label}. Суммы в TL приведены только для справки.`;
    default:
      return `Nightly rates are set in ${label}. Your prepayment and the payment due at check-in are charged in ${label}. TL amounts are shown for information only.`;
  }
}
