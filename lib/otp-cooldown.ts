import { prisma } from "@/lib/db";

export const OTP_RESEND_COOLDOWN_MS = 10 * 60 * 1000;

export type ActiveOtpCooldown = {
  verificationId: string;
  channel: "sms" | "whatsapp" | null;
  expiresAt: Date;
  retryAfterSec: number;
};

/** Kullanılmamış ve süresi dolmamış OTP varsa yeni kod gönderilmez. */
export async function findActiveOtpCooldown(
  phone: string,
  purpose: string
): Promise<ActiveOtpCooldown | null> {
  const active = await prisma.verificationCode.findFirst({
    where: {
      phone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      channel: true,
      expiresAt: true,
    },
  });
  if (!active) return null;

  const retryAfterSec = Math.max(
    1,
    Math.ceil((active.expiresAt.getTime() - Date.now()) / 1000)
  );

  return {
    verificationId: active.id,
    channel:
      active.channel === "sms" || active.channel === "whatsapp"
        ? active.channel
        : null,
    expiresAt: active.expiresAt,
    retryAfterSec,
  };
}

export function otpCooldownUserMessage(channel?: "sms" | "whatsapp" | null) {
  if (channel === "sms") {
    return "SMS ile gönderilen doğrulama kodunu kullanın.";
  }
  return "WhatsApp'a gönderilen doğrulama kodunu kullanın.";
}
