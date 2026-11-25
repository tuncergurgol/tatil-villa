import { prisma } from "@/lib/db";
import {
  getRequestClientIp,
  getRequestUserAgent,
} from "@/lib/request-client-ip";
import { resolveRequestDeviceToken } from "@/lib/request-device-token";

export const PUBLIC_OTP_SEND_PURPOSE = "public_otp_send" as const;
export const PUBLIC_OTP_VERIFY_PURPOSE = "public_otp_verify" as const;

const SEND_LIMIT = 3;
const VERIFY_LIMIT = 8;
const WINDOW_MS = 60 * 1000;
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export type PublicRequestIdentity = {
  clientIp: string;
  deviceToken: string;
  userAgent: string;
};

export type PublicRequestGuardResult =
  | ({ ok: true } & PublicRequestIdentity)
  | { ok: false; error: string; retryAfterSec: number };

function blockedMessage(retryAfterSec: number) {
  return `Çok fazla deneme. Lütfen ${retryAfterSec} saniye sonra tekrar deneyin.`;
}

export async function assertPublicRequestAllowed(options: {
  purpose: typeof PUBLIC_OTP_SEND_PURPOSE | typeof PUBLIC_OTP_VERIFY_PURPOSE;
  phone?: string | null;
  formDeviceToken?: string | null;
}): Promise<PublicRequestGuardResult> {
  const [clientIp, deviceToken, userAgent] = await Promise.all([
    getRequestClientIp(),
    resolveRequestDeviceToken(options.formDeviceToken),
    getRequestUserAgent(),
  ]);

  const identity: PublicRequestIdentity = {
    clientIp: clientIp ?? "",
    deviceToken,
    userAgent,
  };

  const phone = options.phone?.trim() ?? "";
  const limit =
    options.purpose === PUBLIC_OTP_VERIFY_PURPOSE ? VERIFY_LIMIT : SEND_LIMIT;
  const since = new Date(Date.now() - WINDOW_MS);
  const orFilters = [
    identity.clientIp ? { clientIp: identity.clientIp } : null,
    identity.deviceToken ? { deviceToken: identity.deviceToken } : null,
    phone ? { phone } : null,
  ].filter((item): item is { clientIp: string } | { deviceToken: string } | { phone: string } =>
    Boolean(item)
  );

  const cutoff = new Date(Date.now() - RETENTION_MS);
  await prisma.publicRequestGuardEvent
    .deleteMany({ where: { createdAt: { lt: cutoff } } })
    .catch(() => undefined);

  const result = await prisma.$transaction(async (tx) => {
    const count =
      orFilters.length === 0
        ? 0
        : await tx.publicRequestGuardEvent.count({
            where: {
              purpose: options.purpose,
              createdAt: { gte: since },
              OR: orFilters,
            },
          });

    const blocked = count >= limit;
    await tx.publicRequestGuardEvent.create({
      data: {
        purpose: options.purpose,
        clientIp: identity.clientIp,
        deviceToken: identity.deviceToken,
        phone,
        userAgent: identity.userAgent,
        blocked,
      },
    });

    return { blocked, count };
  });

  if (result.blocked) {
    return {
      ok: false,
      error: blockedMessage(60),
      retryAfterSec: 60,
    };
  }

  return { ok: true, ...identity };
}
