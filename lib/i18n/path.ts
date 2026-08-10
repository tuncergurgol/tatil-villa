import { routing } from "@/i18n/routing";

const nonDefaultLocalePattern = new RegExp(
  `^/(?:${routing.locales.filter((locale) => locale !== routing.defaultLocale).join("|")})(?=/|$)`
);

/** Varsayılan olmayan dil önekini kaldırır (/en/foo → /foo değil, /en korunur). */
export function stripLocalePrefix(pathname: string) {
  const stripped = pathname.replace(nonDefaultLocalePattern, "");
  return stripped === "" ? "/" : stripped;
}

/** Eski /tr/... bağlantılarını kök yola çevirir. */
export function stripDefaultLocalePrefix(pathname: string) {
  if (pathname === "/tr") return "/";
  if (pathname.startsWith("/tr/")) {
    const stripped = pathname.slice(3);
    return stripped ? `/${stripped.replace(/^\/+/, "")}` : "/";
  }
  return pathname;
}
