import { createHmac, randomInt, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

function signingSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.TURNSTILE_SECRET_KEY?.trim() ||
    "tatildeyiz-dev-captcha"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export type SimpleCaptchaChallenge = {
  question: string;
  token: string;
};

export function createSimpleCaptchaChallenge(): SimpleCaptchaChallenge {
  const a = randomInt(2, 12);
  const b = randomInt(1, 10);
  const answer = String(a + b);
  const exp = String(Date.now() + TTL_MS);
  const body = `${answer}.${exp}`;
  const token = `${body}.${sign(body)}`;
  return {
    question: `${a} + ${b} = ?`,
    token,
  };
}

export function verifySimpleCaptcha(
  token: string | null | undefined,
  answer: string | null | undefined
): { ok: true } | { ok: false; error: string } {
  const raw = String(token ?? "").trim();
  const value = String(answer ?? "").trim().replace(/\s+/g, "");
  if (!raw || !value) {
    return { ok: false, error: "Lütfen güvenlik sorusunu yanıtlayın." };
  }

  const parts = raw.split(".");
  if (parts.length !== 3) {
    return { ok: false, error: "Güvenlik doğrulaması geçersiz. Sayfayı yenileyin." };
  }
  const [expected, exp, sig] = parts;
  const body = `${expected}.${exp}`;
  const expectedSig = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Güvenlik doğrulaması geçersiz. Sayfayı yenileyin." };
    }
  } catch {
    return { ok: false, error: "Güvenlik doğrulaması geçersiz. Sayfayı yenileyin." };
  }

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return { ok: false, error: "Güvenlik sorusunun süresi doldu. Yenileyin." };
  }

  if (value !== expected) {
    return { ok: false, error: "Güvenlik sorusu yanlış. Tekrar deneyin." };
  }

  return { ok: true };
}
