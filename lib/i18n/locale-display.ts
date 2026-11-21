import type { AppLocale } from "@/i18n/routing";

const LOCALE_TO_BCP47: Record<AppLocale, string> = {
  tr: "tr-TR",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  bg: "bg-BG",
  el: "el-GR",
  zh: "zh-CN",
  ru: "ru-RU",
};

export function localeToBcp47(locale: string): string {
  return LOCALE_TO_BCP47[locale as AppLocale] ?? locale;
}

/** Pazartesi başlangıçlı kısa hafta günü etiketleri */
export function weekdayLabelsForLocale(locale: string): string[] {
  const bcp47 = localeToBcp47(locale);
  // 2024-01-01 = Pazartesi
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2024, 0, 1 + index));
    return new Intl.DateTimeFormat(bcp47, {
      weekday: "short",
      timeZone: "UTC",
    }).format(date);
  });
}

export function monthLabelForLocale(
  year: number,
  month: number,
  locale: string
): string {
  const bcp47 = localeToBcp47(locale);
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat(bcp47, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatHeroDateForLocale(
  dateKey: string,
  locale: string,
  compact = false
): string {
  const bcp47 = localeToBcp47(locale);
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year!, (month ?? 1) - 1, day ?? 1);

  if (compact) {
    return new Intl.DateTimeFormat(bcp47, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  const formattedDate = new Intl.DateTimeFormat(bcp47, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const weekday = new Intl.DateTimeFormat(bcp47, { weekday: "long" }).format(
    date
  );
  const capitalizedWeekday =
    weekday.charAt(0).toLocaleUpperCase(bcp47) + weekday.slice(1);

  return `${formattedDate} - ${capitalizedWeekday}`;
}
