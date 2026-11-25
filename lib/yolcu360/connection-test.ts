import { getYolcu360BaseUrl } from "@/lib/yolcu360/settings";
import type { Yolcu360Environment } from "@/lib/yolcu360/types";

export const YOLCU360_PRODUCTION_SERVER_IP = "185.184.210.96";

export async function testYolcu360Credentials(
  apiKey: string,
  apiSecret: string,
  environment: Yolcu360Environment
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = apiKey.trim();
  const secret = apiSecret.trim();
  if (!key || !secret) {
    return { ok: false, error: "API anahtarı ve secret tanımlı olmalı" };
  }

  const baseUrl = getYolcu360BaseUrl(environment);
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, secret }),
    cache: "no-store",
  });

  if (loginRes.ok) {
    return { ok: true };
  }

  if (loginRes.status === 403) {
    return {
      ok: false,
      error:
        environment === "production"
          ? `Production API erişimi engellendi (403). Yolcu360'dan sunucu IP'sinin (${YOLCU360_PRODUCTION_SERVER_IP}) production whitelist'ine eklenmesini isteyin.`
          : "Staging API erişimi engellendi (403).",
    };
  }

  const payload = (await loginRes.json().catch(() => null)) as
    | { description?: string }
    | null;

  return {
    ok: false,
    error: payload?.description ?? `Yolcu360 bağlantı testi başarısız (${loginRes.status})`,
  };
}
