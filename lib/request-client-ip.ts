import { headers } from "next/headers";

/**
 * Proxy arkasındaki gerçek istemci IP'sini okur.
 * `x-forwarded-for` (ilk adres) → `x-real-ip` → `cf-connecting-ip`.
 */
export async function getRequestClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for")?.trim() ?? "";
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim() ?? "";
      if (first) return first;
    }
    const realIp = h.get("x-real-ip")?.trim() ?? "";
    if (realIp) return realIp;
    const cfIp = h.get("cf-connecting-ip")?.trim() ?? "";
    if (cfIp) return cfIp;
  } catch {
    // headers() dışı bağlam (script vb.)
  }
  return null;
}
