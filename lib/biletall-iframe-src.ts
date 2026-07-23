import type { BiletallCredentials, BiletallIframeKind } from "@/lib/biletall";

export const BILETALL_PORTAL_SLUG = "tatildeyizcomtr";

export const BILETALL_CALLBACK_QUERY =
  "AramaUrl=/bilet/ara&IslemUrl=/bilet/satinal&BiletGosterimUrl=/bilet/sonuc";

export const BILETALL_DEFAULT_IFRAME_SRC: Record<BiletallIframeKind, string> = {
  ara: `https://iframe.biletall.com/portals/${BILETALL_PORTAL_SLUG}/UI/Arama.aspx?${BILETALL_CALLBACK_QUERY}`,
  satinal: `https://iframe.biletall.com/portals/${BILETALL_PORTAL_SLUG}/UI/Islem.aspx?${BILETALL_CALLBACK_QUERY}`,
  sonuc: `https://iframe.biletall.com/portals/${BILETALL_PORTAL_SLUG}/UI/BiletGosterim.aspx?${BILETALL_CALLBACK_QUERY}`,
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
      params.set(key, value.trim());
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
