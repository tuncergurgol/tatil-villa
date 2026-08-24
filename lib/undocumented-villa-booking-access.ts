import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "@/lib/auth-secret";

/** URL query param — belgesiz villada rezervasyon/takvim kilidini açar */
export const UNDOCUMENTED_BOOKING_ACCESS_PARAM = "rez";

/** Varsayılan geçerlilik: 14 gün */
export const UNDOCUMENTED_BOOKING_ACCESS_TTL_SECONDS = 14 * 24 * 60 * 60;

type AccessPayload = {
  v: string;
  exp: number;
};

function accessSecret(): string {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET tanımlı değil; belgesiz rezervasyon linki üretilemez");
  }
  return secret;
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

function signPayload(encodedPayload: string): string {
  return toBase64Url(
    createHmac("sha256", accessSecret()).update(encodedPayload).digest()
  );
}

export function createUndocumentedVillaBookingAccessToken(
  villaId: string,
  ttlSeconds = UNDOCUMENTED_BOOKING_ACCESS_TTL_SECONDS
): string {
  const payload: AccessPayload = {
    v: villaId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyUndocumentedVillaBookingAccessToken(
  token: string | null | undefined,
  villaId: string
): boolean {
  if (!token?.trim() || !villaId) return false;

  try {
    const [encodedPayload, signature] = token.trim().split(".");
    if (!encodedPayload || !signature) return false;

    const expected = signPayload(encodedPayload);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return false;
    }

    const payload = JSON.parse(
      fromBase64Url(encodedPayload).toString("utf8")
    ) as AccessPayload;
    if (!payload?.v || typeof payload.exp !== "number") return false;
    if (payload.v !== villaId) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function appendUndocumentedBookingAccessParam(
  url: string,
  token: string
): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${UNDOCUMENTED_BOOKING_ACCESS_PARAM}=${encodeURIComponent(token)}`;
}
