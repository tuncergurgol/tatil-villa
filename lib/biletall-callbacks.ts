import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";

export type BiletallCallbackIframeKind = "ara" | "satinal" | "sonuc";
export type BiletallCallbackFormat = "absolute" | "relative";

/** Biletall tüm iframe türlerinde tutarlı mutlak callback URL bekler. */
export function resolveBiletallCallbackFormat(
  _kind?: BiletallCallbackIframeKind
): BiletallCallbackFormat {
  return "absolute";
}

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

export function formatBiletallCallbackPath(
  path: string,
  publicOrigin: string,
  format: BiletallCallbackFormat
) {
  const trimmed = path.trim().replace(/\s+/g, "");
  if (!trimmed) return "";

  if (format === "absolute") {
    return publicOrigin
      ? toBiletallCallbackUrl(trimmed, publicOrigin)
      : trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
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

const RESERVED_IFRAME_QUERY_KEYS = new Set([
  "AramaUrl",
  "IslemUrl",
  "BiletGosterimUrl",
  "BiletGosterUrl",
  "SiteAdres",
  "KullaniciAdi",
  "Sifre",
]);

export function syncBiletallCallbackParamsInSrc(
  src: string,
  callbacks: BiletallCallbackParams,
  publicOrigin: string,
  kind?: BiletallCallbackIframeKind
) {
  const format = resolveBiletallCallbackFormat(kind);

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
      url.searchParams.set(
        key,
        formatBiletallCallbackPath(value, publicOrigin, format)
      );
    }

    return url.toString();
  } catch {
    return src;
  }
}

export function appendBiletallForwardQuery(
  src: string,
  searchParams?: Record<string, string | string[] | undefined>
) {
  if (!searchParams) return src;

  try {
    const url = new URL(src);

    for (const [key, value] of Object.entries(searchParams)) {
      if (!value || RESERVED_IFRAME_QUERY_KEYS.has(key)) continue;

      if (Array.isArray(value)) {
        url.searchParams.delete(key);
        for (const item of value) {
          if (item) url.searchParams.append(key, item);
        }
        continue;
      }

      url.searchParams.set(key, value);
    }

    return url.toString();
  } catch {
    return src;
  }
}
