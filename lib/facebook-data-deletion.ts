import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

type SignedRequestPayload = {
  algorithm?: string;
  issued_at?: number;
  user_id?: string;
};

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

export function parseFacebookSignedRequest(
  signedRequest: string,
  appSecret: string
): SignedRequestPayload | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts;
  if (!encodedSig || !encodedPayload) return null;

  try {
    const sig = base64UrlDecode(encodedSig);
    const expected = createHmac("sha256", appSecret)
      .update(encodedPayload)
      .digest();

    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
      return null;
    }

    const payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8")
    ) as SignedRequestPayload;

    if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildDataDeletionConfirmation(
  domain: string,
  confirmationCode: string
) {
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  return {
    url: `${base}/meta/veri-silme?code=${encodeURIComponent(confirmationCode)}`,
    confirmation_code: confirmationCode,
  };
}
