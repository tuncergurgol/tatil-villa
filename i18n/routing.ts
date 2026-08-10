import { defineRouting } from "next-intl/routing";

export const locales = [
  "tr",
  "en",
  "de",
  "fr",
  "es",
  "bg",
  "el",
  "zh",
] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "tr";

export const localeLabels: Record<
  AppLocale,
  { code: string; name: string; nativeName: string }
> = {
  tr: { code: "TR", name: "Turkish", nativeName: "Türkçe" },
  en: { code: "EN", name: "English", nativeName: "English" },
  de: { code: "DE", name: "German", nativeName: "Deutsch" },
  fr: { code: "FR", name: "French", nativeName: "Français" },
  es: { code: "ES", name: "Spanish", nativeName: "Español" },
  bg: { code: "BG", name: "Bulgarian", nativeName: "Български" },
  el: { code: "EL", name: "Greek", nativeName: "Ελληνικά" },
  zh: { code: "ZH", name: "Chinese", nativeName: "中文" },
};

const publicSiteDomains = [
  "www.tatildeyiz.com.tr",
  "tatildeyiz.com.tr",
  "www.balayivillacisi.com",
  "balayivillacisi.com",
  "www.tatilvillacisi.com",
  "tatilvillacisi.com",
] as const;

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "as-needed",
  // URL'den locale okunur; cookie/Accept-Language ile /tr/ veya /en/ yönlendirmesi yapılmaz
  localeDetection: false,
  domains: publicSiteDomains.map((domain) => ({
    domain,
    defaultLocale,
    locales: [...locales],
  })),
});
