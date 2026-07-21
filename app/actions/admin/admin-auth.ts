"use server";

import bcrypt from "bcryptjs";
import { type Prisma } from "@prisma/client";
import { z } from "zod";
import { getAdminPanelBaseUrl } from "@/lib/admin-auth-url";
import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { deliverOtpCode } from "@/lib/otp-delivery";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  ADMIN_LOGIN_OTP_PURPOSE,
  ADMIN_PASSWORD_RESET_PURPOSE,
  ADMIN_PASSWORD_RESET_TTL_MS,
  OTP_TTL_MS,
  createUniqueOtpCode,
  generatePasswordResetToken,
  invalidateActiveOtps,
  type AdminLoginOtpPayload,
  type AdminPasswordResetPayload,
} from "@/lib/verification-otp";

export type AdminAuthActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  needsVerification?: boolean;
  phone?: string;
  verificationId?: string;
  channel?: "sms" | "whatsapp";
  email?: string;
};

const GENERIC_RESET_MESSAGE =
  "E-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.";

function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 7) return e164;
  return `****${digits.slice(-4)}`;
}

async function findActiveAdminUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      passwordHash: true,
      active: true,
    },
  });
}

const startLoginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

/** E-posta + şifre doğrula, WhatsApp OTP gönder */
export async function startAdminLoginAction(
  _prev: AdminAuthActionState,
  formData: FormData
): Promise<AdminAuthActionState> {
  const parsed = startLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const rate = checkRateLimit({
    key: `admin-login:${email}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return { error: "Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin." };
  }

  const user = await findActiveAdminUser(email);
  if (!user || !user.active) {
    return { error: "E-posta veya şifre hatalı" };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "E-posta veya şifre hatalı" };
  }

  const phone = normalizePhoneToE164(user.phone);
  if (!phone || !isValidTurkishMobileE164(phone)) {
    return {
      error:
        "WhatsApp doğrulaması için kullanıcı kaydında geçerli cep telefonu tanımlı olmalıdır. Yöneticinizle iletişime geçin.",
    };
  }

  const company = await getCompanySettings();
  const payload: AdminLoginOtpPayload = {
    userId: user.id,
    email: user.email,
  };

  await invalidateActiveOtps(phone, ADMIN_LOGIN_OTP_PURPOSE);
  const code = await createUniqueOtpCode(phone, ADMIN_LOGIN_OTP_PURPOSE);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const delivery = await deliverOtpCode(phone, code, ADMIN_LOGIN_OTP_PURPOSE, {
    brandName: company.brandName || "Bont Yönetim",
  });
  if (!delivery.ok) {
    return { error: delivery.error ?? "Doğrulama kodu gönderilemedi" };
  }

  const record = await prisma.verificationCode.create({
    data: {
      phone,
      code,
      purpose: ADMIN_LOGIN_OTP_PURPOSE,
      expiresAt,
      channel: delivery.channel,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    needsVerification: true,
    email: user.email,
    phone,
    verificationId: record.id,
    channel: delivery.channel,
    message: `Giriş kodu ${
      delivery.channel === "sms" ? "SMS" : "WhatsApp"
    } ile ${maskPhone(phone)} numarasına gönderildi.`,
  };
}

/** OTP yeniden gönder (şifre tekrar doğrulanır) */
export async function resendAdminLoginOtpAction(
  _prev: AdminAuthActionState,
  formData: FormData
): Promise<AdminAuthActionState> {
  return startAdminLoginAction(_prev, formData);
}

const forgotSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
});

export async function requestAdminPasswordResetAction(
  _prev: AdminAuthActionState,
  formData: FormData
): Promise<AdminAuthActionState> {
  const parsed = forgotSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz e-posta",
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const rate = checkRateLimit({
    key: `admin-reset:${email}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return { success: true, message: GENERIC_RESET_MESSAGE };
  }

  const user = await findActiveAdminUser(email);
  if (!user || !user.active) {
    return { success: true, message: GENERIC_RESET_MESSAGE };
  }

  await invalidateActiveOtps(email, ADMIN_PASSWORD_RESET_PURPOSE);
  const token = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + ADMIN_PASSWORD_RESET_TTL_MS);
  const payload: AdminPasswordResetPayload = {
    userId: user.id,
    email: user.email,
  };

  await prisma.verificationCode.create({
    data: {
      phone: email,
      code: token,
      purpose: ADMIN_PASSWORD_RESET_PURPOSE,
      expiresAt,
      channel: "email",
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  const company = await getCompanySettings();
  const resetUrl = `${getAdminPanelBaseUrl()}/admin/login/sifre-sifirla?token=${encodeURIComponent(token)}`;

  try {
    await sendCompanyMail(company, {
      to: user.email,
      subject: "Bont Yönetim — Şifre sıfırlama",
      text: `Merhaba ${user.name},

Bont yönetim paneli şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın:

${resetUrl}

Bu bağlantı 1 saat geçerlidir. Talebi siz yapmadıysanız bu e-postayı yok sayın.`,
      html: `<p>Merhaba ${user.name},</p>
<p>Bont yönetim paneli şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>Bu bağlantı 1 saat geçerlidir. Talebi siz yapmadıysanız bu e-postayı yok sayın.</p>`,
    });
  } catch (error) {
    console.error("[admin-auth] password reset mail failed", error);
    return {
      error:
        "Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.",
    };
  }

  return { success: true, message: GENERIC_RESET_MESSAGE };
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Geçersiz bağlantı"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  passwordConfirm: z.string().min(1, "Şifre tekrarı gerekli"),
});

export async function resetAdminPasswordAction(
  _prev: AdminAuthActionState,
  formData: FormData
): Promise<AdminAuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  if (parsed.data.password !== parsed.data.passwordConfirm) {
    return { error: "Şifreler eşleşmiyor" };
  }

  const record = await prisma.verificationCode.findFirst({
    where: {
      code: parsed.data.token.trim(),
      purpose: ADMIN_PASSWORD_RESET_PURPOSE,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    return {
      error: "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
    };
  }

  const payload = record.payload as AdminPasswordResetPayload | null;
  if (!payload?.userId) {
    return { error: "Şifre sıfırlama kaydı geçersiz." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash },
    }),
    prisma.verificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.verificationCode.updateMany({
      where: {
        phone: record.phone,
        purpose: ADMIN_PASSWORD_RESET_PURPOSE,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    message: "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
  };
}
