import type { AppLocale } from "@/i18n/routing";
import type { PublicSiteKey } from "@/lib/public-site-keys";

type HomeHeroKeys =
  | "heroTitleDefault"
  | "heroTitleBalayi"
  | "heroTitleTatilVillacisi"
  | "heroTitleGlamping";

const SITE_HERO_KEY: Partial<Record<PublicSiteKey, HomeHeroKeys>> = {
  tatildeyiz: "heroTitleDefault",
  "balayi-villacisi": "heroTitleBalayi",
  "tatil-villacisi": "heroTitleTatilVillacisi",
  "glamping-turkey": "heroTitleGlamping",
};

export function heroTitleMessageKey(
  siteKey: PublicSiteKey
): HomeHeroKeys | null {
  return SITE_HERO_KEY[siteKey] ?? null;
}

export function shouldLocalizeHeroTitle(
  locale: string,
  siteKey: PublicSiteKey
): boolean {
  if ((locale as AppLocale) === "tr") return false;
  return heroTitleMessageKey(siteKey) != null;
}
