export type PublicHomeTheme = "theme-1" | "theme-2";

/** TEMA 1: Tatildeyiz / Balayı Villacısı / Tatil Villacısı mevcut ana sayfa. */
export const THEME_1_SITE_KEYS = [
  "tatildeyiz",
  "balayi-villacisi",
  "tatil-villacisi",
] as const;

/** TEMA 2: Glamping Turkey — GlampingHub tarzı keşif ızgarası. */
export const THEME_2_SITE_KEYS = ["glamping-turkey"] as const;

export function getPublicHomeTheme(siteKey: string | null | undefined): PublicHomeTheme {
  if (siteKey && (THEME_2_SITE_KEYS as readonly string[]).includes(siteKey)) {
    return "theme-2";
  }
  return "theme-1";
}
