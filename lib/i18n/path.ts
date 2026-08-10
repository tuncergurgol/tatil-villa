import { routing } from "@/i18n/routing";

const localePattern = new RegExp(
  `^/(?:${routing.locales.filter((locale) => locale !== routing.defaultLocale).join("|")})(?=/|$)`
);

export function stripLocalePrefix(pathname: string) {
  const stripped = pathname.replace(localePattern, "");
  return stripped === "" ? "/" : stripped;
}
