import type { BiletallCredentials, BiletallIframeKind } from "@/lib/biletall";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import {
  resolveBiletallPublicOrigin,
  resolveBiletallCallbackFormat,
  formatBiletallCallbackPath,
} from "@/lib/biletall-callbacks";

export const BILETALL_PORTAL_SLUG = "tatildeyizcomtr";

function buildDefaultCallbacks(
  kind: BiletallIframeKind,
  publicOrigin = resolveBiletallPublicOrigin()
) {
  const hostname = sanitizePublicBookingDomain(
    publicOrigin.replace(/^https?:\/\//i, "")
  );
  const format = resolveBiletallCallbackFormat(kind);

  return {
    AramaUrl: formatBiletallCallbackPath("/bilet/ara", publicOrigin, format),
    IslemUrl: formatBiletallCallbackPath("/bilet/satinal", publicOrigin, format),
    BiletGosterimUrl: formatBiletallCallbackPath(
      "/bilet/sonuc",
      publicOrigin,
      format
    ),
    SiteAdres: hostname,
  };
}

export function buildBiletallDefaultIframeSrc(
  kind: BiletallIframeKind,
  publicOrigin = resolveBiletallPublicOrigin()
) {
  const fileByKind: Record<BiletallIframeKind, string> = {
    ara: "Arama.aspx",
    satinal: "Islem.aspx",
    sonuc: "BiletGosterim.aspx",
  };

  const query = new URLSearchParams(
    buildDefaultCallbacks(kind, publicOrigin)
  ).toString();
  return `https://iframe.biletall.com/portals/${BILETALL_PORTAL_SLUG}/UI/${fileByKind[kind]}?${query}`;
}

export const BILETALL_DEFAULT_IFRAME_SRC: Record<BiletallIframeKind, string> = {
  ara: buildBiletallDefaultIframeSrc("ara"),
  satinal: buildBiletallDefaultIframeSrc("satinal"),
  sonuc: buildBiletallDefaultIframeSrc("sonuc"),
};

const BILETALL_IFRAME_SRC_PATTERN =
  /^https:\/\/iframe\.biletall\.com\/portals\/[a-z0-9_-]+\/(?:UI|v2)\/[A-Za-z]+\.aspx(?:\?.*)?$/i;

export function normalizeIframeSrcUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      params.set(key, value);
    }
    url.search = params.toString();
    return url.toString();
  } catch {
    return trimmed.replace(/\s+&/g, "&").replace(/=\s+/g, "=").replace(/\s+$/g, "");
  }
}

export function extractIframeSrcFromHtml(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const srcMatch = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    return normalizeIframeSrcUrl(srcMatch[1]);
  }

  return normalizeIframeSrcUrl(trimmed);
}

export function sanitizeBiletallIframeSrc(input?: string | null): string {
  const extracted = extractIframeSrcFromHtml(input ?? "");
  if (!extracted) return "";

  if (!extracted.startsWith("https://iframe.biletall.com/")) {
    return "";
  }

  const normalized = normalizeIframeSrcUrl(extracted);
  if (!BILETALL_IFRAME_SRC_PATTERN.test(normalized.split("#")[0] ?? "")) {
    return "";
  }

  return normalized;
}

export function appendBiletallCredentialsToSrc(
  src: string,
  credentials?: BiletallCredentials
) {
  const username = credentials?.username?.trim();
  const password = credentials?.password?.trim();
  if (!username && !password) return src;

  try {
    const url = new URL(src);
    if (username) url.searchParams.set("KullaniciAdi", username);
    if (password) url.searchParams.set("Sifre", password);
    return url.toString();
  } catch {
    return src;
  }
}

export function isValidBiletallIframeSrc(input?: string | null) {
  return Boolean(sanitizeBiletallIframeSrc(input));
}

export { resolveBiletallPublicOrigin } from "@/lib/biletall-callbacks";
