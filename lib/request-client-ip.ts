import { headers } from "next/headers";

function cleanIp(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value || value.toLowerCase() === "unknown") return null;
  return value;
}

/**
 * Proxy arkasındaki gerçek istemci IP'sini okur.
 * Cloudflare + nginx `real_ip` sonrası `x-real-ip` güvenilirdir.
 * `x-forwarded-for` ilk adresi spoof edilebilir; bu yüzden sonda bırakılır.
 */
export async function getRequestClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const cfIp = cleanIp(h.get("cf-connecting-ip"));
    if (cfIp) return cfIp;
    const realIp = cleanIp(h.get("x-real-ip"));
    if (realIp) return realIp;
    const forwarded = h.get("x-forwarded-for")?.trim() ?? "";
    if (forwarded) {
      const parts = forwarded
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const last = parts[parts.length - 1];
      const cleaned = cleanIp(last);
      if (cleaned) return cleaned;
    }
  } catch {
    // headers() dışı bağlam (script vb.)
  }
  return null;
}

export async function getRequestUserAgent(): Promise<string> {
  try {
    const h = await headers();
    return h.get("user-agent")?.trim().slice(0, 400) ?? "";
  } catch {
    return "";
  }
}
