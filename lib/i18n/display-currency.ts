import type { VillaPeriodCurrency } from "@/lib/villa-period-pricing";

/** Avrupa vitrininde görünen para birimi. Ödeme, dönemin kendi kurunda kalır. */
export function preferredDisplayCurrency(locale: string): VillaPeriodCurrency {
  if (!locale || locale === "tr") return "TL";
  if (locale === "en") return "GBP";
  return "EUR";
}

export function currencySymbol(currency: string): string {
  if (currency === "TL" || currency === "TRY") return "₺";
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  if (currency === "USD") return "$";
  return "";
}
