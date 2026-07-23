const BILETALL_IFRAME_SRC_PATTERN =
  /^https:\/\/iframe\.biletall\.com\/portals\/[a-z0-9_-]+\/(?:UI|v2)\/[A-Za-z]+\.aspx(?:\?.*)?$/i;

export function extractIframeSrcFromHtml(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const srcMatch = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    return srcMatch[1].trim();
  }

  return trimmed;
}

export function sanitizeBiletallIframeSrc(input?: string | null): string {
  const extracted = extractIframeSrcFromHtml(input ?? "");
  if (!extracted) return "";

  if (!extracted.startsWith("https://iframe.biletall.com/")) {
    return "";
  }

  if (!BILETALL_IFRAME_SRC_PATTERN.test(extracted.split("#")[0] ?? "")) {
    return "";
  }

  return extracted;
}

export function isValidBiletallIframeSrc(input?: string | null) {
  return Boolean(sanitizeBiletallIframeSrc(input));
}
