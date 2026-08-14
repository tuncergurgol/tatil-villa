import "server-only";

import { headers } from "next/headers";
import {
  resolveBiletallPublicOrigin,
} from "@/lib/biletall-callbacks";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";

export async function resolveBiletallRequestOrigin(
  fallbackDomain?: string | null
) {
  try {
    const headerStore = await headers();
    const rawHost =
      headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      headerStore.get("host")?.trim();
    if (rawHost) {
      const host = rawHost.toLowerCase();
      if (host.includes("bont.")) {
        return resolveBiletallPublicOrigin(fallbackDomain);
      }
      if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
        return `http://${host}`;
      }
      return `https://${host}`;
    }
  } catch {
    // headers() yalnızca request bağlamında kullanılabilir.
  }

  return resolveBiletallPublicOrigin(fallbackDomain);
}

export async function resolveBiletallRequestHostname(
  fallbackDomain?: string | null
) {
  const origin = await resolveBiletallRequestOrigin(fallbackDomain);
  return sanitizePublicBookingDomain(origin.replace(/^https?:\/\//i, ""));
}
