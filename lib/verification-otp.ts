import { randomInt, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const CALLBACK_OTP_PURPOSE = "callback_request" as const;
export const BOOKING_GUEST_LOGIN_OTP_PURPOSE = "booking_guest_login" as const;
export const ADMIN_LOGIN_OTP_PURPOSE = "admin_login" as const;
export const ADMIN_PASSWORD_RESET_PURPOSE = "admin_password_reset" as const;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const ADMIN_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const OTP_CODE_LENGTH = 5;

export type CallbackRequestOtpPayload = {
  name: string;
  phone: string;
  note: string;
  preferredDay: "TODAY" | "TOMORROW" | "THIS_WEEK" | "ANY";
  preferredTime: "ASAP" | "MORNING" | "AFTERNOON" | "EVENING";
  sourceSite: string;
  sourceDomain: string;
};

export type BookingGuestLoginOtpPayload = {
  bookingId: string;
  email: string;
  reservationCode: string;
};

export type AdminLoginOtpPayload = {
  userId: string;
  email: string;
};

export type AdminPasswordResetPayload = {
  userId: string;
  email: string;
};

function generateFiveDigitCode(): string {
  return String(randomInt(10000, 100000));
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** Aktif (kullanılmamış, süresi dolmamış) kodlar arasında unique 5 haneli kod. */
export async function createUniqueOtpCode(
  phone: string,
  purpose: string
): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = generateFiveDigitCode();

    // Aynı telefon+purpose+code satırı daha önce oluşmuşsa (unique) tekrar kullanılamaz
    const exact = await prisma.verificationCode.findUnique({
      where: {
        code_purpose_phone: { code, purpose, phone },
      },
      select: { id: true },
    });
    if (exact) continue;

    // Başka telefonda aynı anda aktif aynı kod olmasın (işlem-unique + karışıklık önleme)
    const activeElsewhere = await prisma.verificationCode.findFirst({
      where: {
        code,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (activeElsewhere) continue;

    return code;
  }
  throw new Error("Doğrulama kodu üretilemedi");
}

export async function invalidateActiveOtps(phone: string, purpose: string) {
  await prisma.verificationCode.updateMany({
    where: {
      phone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      usedAt: new Date(),
    },
  });
}
