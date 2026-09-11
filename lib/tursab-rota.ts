export const DEFAULT_TURSB_ROTA_WHITELABEL_URL =
  "https://whitelabel.tursabrota.com/glamping-turizm-seyahat-acentasi";

/** Yalnızca TÜRSAB Rota whitelabel alan adları embed / yönlendirme için kabul edilir. */
export function isAllowedTursabRotaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "whitelabel.tursabrota.com" || host.endsWith(".tursabrota.com");
  } catch {
    return false;
  }
}

export function resolveTursabRotaWhiteLabelUrl(
  url: string | null | undefined
): string {
  const trimmed = (url ?? "").trim();
  if (trimmed && isAllowedTursabRotaUrl(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  return DEFAULT_TURSB_ROTA_WHITELABEL_URL;
}
