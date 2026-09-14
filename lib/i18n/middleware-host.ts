/**
 * Edge middleware için host yardımcıları.
 * Prisma veya ağır modül import etmez.
 */

const DEFAULT_PUBLIC_DOMAIN = "www.tatildeyiz.com.tr";

const KNOWN_PUBLIC_HOSTS = new Set([
  "www.tatildeyiz.com.tr",
  "tatildeyiz.com.tr",
  "www.balayivillacisi.com",
  "balayivillacisi.com",
  "www.tatilvillacisi.com",
  "tatilvillacisi.com",
]);

function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .split("/")[0]!
    .split(":")[0]!;
}

export function normalizeRequestHostHeader(
  value: string | null | undefined
): string {
  const firstValue = (value ?? "").split(",")[0]?.trim() ?? "";
  return normalizeHost(firstValue);
}

export function isNonPublicBookingHost(
  domain: string | null | undefined
): boolean {
  const host = normalizeHost(domain ?? "");
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.startsWith("bont.")) return true;
  return false;
}

export function sanitizePublicBookingDomain(
  domain: string | null | undefined
): string {
  const host = normalizeHost(domain ?? "");
  if (!host || isNonPublicBookingHost(host)) {
    return DEFAULT_PUBLIC_DOMAIN;
  }
  return host;
}

export function resolveMiddlewarePublicHostname(
  hostHeader: string | null | undefined,
  forwardedHost: string | null | undefined,
  fallbackHost: string
): string {
  const host = normalizeRequestHostHeader(
    hostHeader ?? forwardedHost ?? fallbackHost
  );
  if (KNOWN_PUBLIC_HOSTS.has(host)) {
    return host;
  }
  return sanitizePublicBookingDomain(host);
}
