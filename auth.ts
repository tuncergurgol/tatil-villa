import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import {
  ADMIN_LOGIN_OTP_PURPOSE,
  type AdminLoginOtpPayload,
} from "@/lib/verification-otp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
        otpCode: { label: "Doğrulama Kodu", type: "text" },
        verificationId: { label: "Doğrulama ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const otpCode = String(credentials.otpCode ?? "").trim();
        const verificationId = String(credentials.verificationId ?? "").trim();

        if (!otpCode || !verificationId) return null;

        const rate = checkRateLimit({
          key: `login:${email}`,
          limit: 8,
          windowMs: 15 * 60 * 1000,
        });
        if (!rate.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        const phone = normalizePhoneToE164(user.phone);
        if (!phone || !isValidTurkishMobileE164(phone)) return null;

        const record = await prisma.verificationCode.findFirst({
          where: {
            id: verificationId,
            phone,
            purpose: ADMIN_LOGIN_OTP_PURPOSE,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
        });

        if (!record || record.code !== otpCode) return null;

        const payload = record.payload as AdminLoginOtpPayload | null;
        if (payload?.userId !== user.id) return null;

        await prisma.verificationCode.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        resetRateLimit(`login:${email}`);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
