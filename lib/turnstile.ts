/** Cloudflare Turnstile sunucu doğrulaması. */

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; error: string };

type TurnstileApiResponse = {
  success: boolean;
  "error-codes"?: string[];
};

function turnstileSecret(): string {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || "";
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    turnstileSecret() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  );
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = turnstileSecret();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  if (!secret) {
    // Site key varken secret yoksa yapılandırma eksik — formu kapatma.
    if (siteKey) {
      return {
        ok: false,
        error: "Güvenlik doğrulaması yapılandırılmamış. Lütfen daha sonra deneyin.",
      };
    }
    // Yerel geliştirmede anahtar yoksa atla.
    return { ok: true };
  }

  const value = String(token ?? "").trim();
  if (!value) {
    return { ok: false, error: "Lütfen güvenlik doğrulamasını tamamlayın." };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", value);
  if (remoteIp?.trim()) body.set("remoteip", remoteIp.trim());

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      }
    );
    if (!res.ok) {
      return {
        ok: false,
        error: "Güvenlik doğrulaması şu an yapılamıyor. Lütfen tekrar deneyin.",
      };
    }
    const data = (await res.json()) as TurnstileApiResponse;
    if (!data.success) {
      return {
        ok: false,
        error: "Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Güvenlik doğrulaması şu an yapılamıyor. Lütfen tekrar deneyin.",
    };
  }
}
