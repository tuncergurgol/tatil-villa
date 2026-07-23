import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";

export function resolveBiletallPublicOrigin(domain?: string | null) {
  return `https://${sanitizePublicBookingDomain(domain)}`;
}

export function resolveBiletallPublicHomeUrl(domain?: string | null) {
  return `${resolveBiletallPublicOrigin(domain)}/`;
}

export function resolveBiletallPortalHostname(domain?: string | null) {
  return sanitizePublicBookingDomain(domain);
}

export function toBiletallCallbackUrl(path: string, publicOrigin: string) {
  const trimmed = path.trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${publicOrigin.replace(/\/+$/, "")}${normalizedPath}`;
}

export type BiletallCallbackParams = {
  AramaUrl: string;
  IslemUrl: string;
  BiletGosterimUrl: string;
  SiteAdres: string;
};

const CALLBACK_PARAM_KEYS = [
  "AramaUrl",
  "IslemUrl",
  "BiletGosterimUrl",
  "BiletGosterUrl",
] as const;

export function syncBiletallCallbackParamsInSrc(
  src: string,
  callbacks: BiletallCallbackParams,
  publicOrigin: string
) {
  try {
    const url = new URL(src);

    url.searchParams.set("AramaUrl", callbacks.AramaUrl);
    url.searchParams.set("IslemUrl", callbacks.IslemUrl);
    url.searchParams.set("BiletGosterimUrl", callbacks.BiletGosterimUrl);
    url.searchParams.set("SiteAdres", callbacks.SiteAdres);
    url.searchParams.delete("BiletGosterUrl");

    for (const key of CALLBACK_PARAM_KEYS) {
      const value = url.searchParams.get(key);
      if (!value) continue;
      url.searchParams.set(key, toBiletallCallbackUrl(value, publicOrigin));
    }

    return url.toString();
  } catch {
    return src;
  }
}
