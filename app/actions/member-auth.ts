"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deliverOtpCode } from "@/lib/otp-delivery";
import {
  createMemberAccountWithLoyalty,
  ensureWelcomeCouponForMember,
  generateUniqueInviteCode,
  linkMemberToCustomer,
  normalizeMemberEmail,
} from "@/lib/member-account";
import {
  findMemberByPhoneOrEmail,
  recognizeReturningGuest,
  type ReturningGuestMatch,
} from "@/lib/returning-guest";
import {
  clearMemberSession,
  createMemberSession,
  getCurrentMember,
} from "@/lib/member-session.server";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  MEMBER_LOGIN_OTP_PURPOSE,
  MEMBER_REGISTER_OTP_PURPOSE,
  MEMBER_RESERVATION_OTP_PURPOSE,
  OTP_TTL_MS,
  createUniqueOtpCode,
  invalidateActiveOtps,
  type MemberOtpPayload,
  type MemberReservationOtpPayload,
} from "@/lib/verification-otp";
import {
  findMemberReservationBooking,
  normalizeMemberLoginEmail,
  parseMemberReservationCode,
} from "@/lib/member-reservation-login";

export type MemberAuthState = {
  success?: boolean;
  error?: string;
  message?: string;
  needsVerification?: boolean;
  phone?: string;
  verifyPhone?: string;
  verificationId?: string;
  channel?: "sms" | "whatsapp";
  redirectTo?: string;
  alreadyRegistered?: boolean;
  otpMode?: "login" | "register" | "reservation";
  welcomeTitle?: string;
  welcomeBody?: string;
};

function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 7) return e164;
  return `****${digits.slice(-4)}`;
}

function welcomeFields(
  match: ReturningGuestMatch | null
): Pick<MemberAuthState, "welcomeTitle" | "welcomeBody"> {
  if (!match) return {};
  return {
    welcomeTitle: match.welcomeTitle,
    welcomeBody: match.welcomeBody,
  };
}

async function alignMemberPhoneToE164(memberId: string, e164: string) {
  const clash = await prisma.memberAccount.findUnique({
    where: { phone: e164 },
    select: { id: true },
  });
  if (clash) return;
  await prisma.memberAccount.update({
    where: { id: memberId },
    data: { phone: e164 },
  });
}

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad gerekli"),
  email: z.string().email("Geçerli e-posta girin"),
  phone: z
    .string()
    .min(1, "Telefon gerekli")
    .transform((value) => normalizePhoneToE164(value) ?? "")
    .refine((value) => isValidTurkishMobileE164(value), "Geçerli telefon girin"),
  inviteCode: z.string().trim().optional(),
  acceptKvkk: z.enum(["true", "false"]).transform((v) => v === "true"),
  acceptMarketing: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const emailLoginSchema = z.object({
  email: z.string().email("Geçerli e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

async function sendMemberOtp(
  phone: string,
  purpose: string,
  payload: MemberOtpPayload
) {
  const rate = checkRateLimit({
    key: `member-otp:${phone}:${purpose}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return { error: "Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin." };
  }

  await invalidateActiveOtps(phone, purpose);
  const code = await createUniqueOtpCode(phone, purpose);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const delivery = await deliverOtpCode(phone, code, purpose, {
    brandName: site.brandName,
  });

  const record = await prisma.verificationCode.create({
    data: {
      phone,
      code,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      payload,
      channel: delivery.channel,
    },
  });

  return {
    verificationId: record.id,
    channel: delivery.channel,
    phone: maskPhone(phone),
  };
}

export async function startMemberPhoneLoginAction(
  phoneRaw: string
): Promise<MemberAuthState> {
  const phone = normalizePhoneToE164(phoneRaw);
  if (!phone || !isValidTurkishMobileE164(phone)) {
    return { error: "Geçerli bir telefon numarası girin" };
  }

  const member = await findMemberByPhoneOrEmail({ phone });
  const guest = await recognizeReturningGuest({ phone });
  if (!member && !guest) {
    return {
      error:
        "Bu telefonla kayıtlı üyelik veya rezervasyon bulunamadı. Önce üye olun.",
    };
  }
  if (member && !member.active) {
    return { error: "Üyelik hesabınız pasif durumda" };
  }

  const otp = await sendMemberOtp(phone, MEMBER_LOGIN_OTP_PURPOSE, {
    memberId: member?.id,
    email: member?.email || guest?.email || undefined,
    fullName: member?.fullName || guest?.fullName || undefined,
  });
  if ("error" in otp) return { error: otp.error };

  return {
    success: true,
    needsVerification: true,
    otpMode: "login",
    verificationId: otp.verificationId,
    channel: otp.channel,
    phone: otp.phone,
    verifyPhone: phone,
    message: `${otp.phone} numarasına doğrulama kodu gönderildi`,
    ...welcomeFields(guest),
  };
}

export async function verifyMemberPhoneLoginAction(input: {
  phone: string;
  code: string;
}): Promise<MemberAuthState> {
  const phone = normalizePhoneToE164(input.phone);
  if (!phone) return { error: "Geçersiz telefon" };

  const record = await prisma.verificationCode.findFirst({
    where: {
      phone,
      purpose: MEMBER_LOGIN_OTP_PURPOSE,
      code: input.code.trim(),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { error: "Doğrulama kodu hatalı veya süresi dolmuş" };

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  let member = await findMemberByPhoneOrEmail({ phone });
  if (!member) {
    const guest = await recognizeReturningGuest({ phone });
    if (!guest) return { error: "Üyelik oluşturulamadı" };

    const company = await getCompanySettings();
    const site = await getPublicSiteProfile(company);
    member = await createMemberAccountWithLoyalty({
      fullName: guest.fullName,
      phone,
      email: guest.email,
      inviteCode: await generateUniqueInviteCode(),
      phoneVerifiedAt: new Date(),
      membershipAcceptedAt: new Date(),
      registeredSiteKey: site.key,
    });
  } else if (member.phone !== phone) {
    await alignMemberPhoneToE164(member.id, phone);
  }

  await prisma.memberAccount.update({
    where: { id: member.id },
    data: { phoneVerifiedAt: new Date() },
  });
  await linkMemberToCustomer(member.id);
  await createMemberSession(member.id);

  return { success: true, redirectTo: "/uye/hesabim" };
}

export async function startMemberRegisterAction(
  formData: FormData
): Promise<MemberAuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    inviteCode: formData.get("inviteCode")?.toString() || "",
    acceptKvkk: formData.get("acceptKvkk") ?? "false",
    acceptMarketing: formData.get("acceptMarketing") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  if (!parsed.data.acceptKvkk) {
    return { error: "Üyelik sözleşmesini kabul etmelisiniz" };
  }

  const phone = parsed.data.phone;
  const email = normalizeMemberEmail(parsed.data.email);
  const existingMember = await findMemberByPhoneOrEmail({ phone, email });
  const guest = await recognizeReturningGuest({ phone, email });

  if (existingMember) {
    if (!existingMember.active) {
      return { error: "Üyelik hesabınız pasif durumda" };
    }
    const otpPhone = existingMember.phone;
    const otp = await sendMemberOtp(otpPhone, MEMBER_LOGIN_OTP_PURPOSE, {
      memberId: existingMember.id,
      email: existingMember.email,
      fullName: existingMember.fullName,
    });
    if ("error" in otp) return { error: otp.error };

    return {
      success: true,
      needsVerification: true,
      alreadyRegistered: true,
      otpMode: "login",
      verificationId: otp.verificationId,
      channel: otp.channel,
      phone: otp.phone,
      verifyPhone: otpPhone,
      message: `${otp.phone} numarasına doğrulama kodu gönderildi. Yeni üyelik açmanıza gerek yok.`,
      ...welcomeFields(guest),
    };
  }

  const otp = await sendMemberOtp(phone, MEMBER_REGISTER_OTP_PURPOSE, {
    email,
    fullName: parsed.data.fullName,
    inviteCode: parsed.data.inviteCode || undefined,
    marketingConsent: parsed.data.acceptMarketing,
  });
  if ("error" in otp) return { error: otp.error };

  return {
    success: true,
    needsVerification: true,
    otpMode: "register",
    verificationId: otp.verificationId,
    channel: otp.channel,
    phone: otp.phone,
    verifyPhone: phone,
    message: guest
      ? "Sizi sistemimizde hatırladık. Üyeliğinizi tamamlamak için doğrulama kodu gönderildi"
      : "Kayıt için doğrulama kodu gönderildi",
    ...welcomeFields(guest),
  };
}

export async function verifyMemberRegisterAction(input: {
  phone: string;
  code: string;
  password?: string;
}): Promise<MemberAuthState> {
  const phone = normalizePhoneToE164(input.phone);
  if (!phone) return { error: "Geçersiz telefon" };

  const record = await prisma.verificationCode.findFirst({
    where: {
      phone,
      purpose: MEMBER_REGISTER_OTP_PURPOSE,
      code: input.code.trim(),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { error: "Doğrulama kodu hatalı veya süresi dolmuş" };

  const payload = (record.payload ?? {}) as MemberOtpPayload;
  if (!payload.fullName || !payload.email) {
    return { error: "Kayıt bilgileri bulunamadı" };
  }

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  let referredByMemberId: string | undefined;
  if (payload.inviteCode?.trim()) {
    const inviter = await prisma.memberAccount.findUnique({
      where: { inviteCode: payload.inviteCode.trim().toUpperCase() },
      select: { id: true },
    });
    if (inviter) referredByMemberId = inviter.id;
  }

  const passwordHash = input.password?.trim()
    ? await bcrypt.hash(input.password.trim(), 12)
    : "";

  const existingMember = await findMemberByPhoneOrEmail({
    phone,
    email: payload.email,
  });
  if (existingMember) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await prisma.memberAccount.update({
      where: { id: existingMember.id },
      data: { phoneVerifiedAt: new Date() },
    });
    await linkMemberToCustomer(existingMember.id);
    await createMemberSession(existingMember.id);
    return { success: true, redirectTo: "/uye/hesabim" };
  }

  const member = await createMemberAccountWithLoyalty({
    fullName: payload.fullName,
    phone,
    email: payload.email,
    passwordHash,
    inviteCode: await generateUniqueInviteCode(),
    referredByMemberId,
    marketingConsent: Boolean(payload.marketingConsent),
    kvkkAcceptedAt: new Date(),
    membershipAcceptedAt: new Date(),
    phoneVerifiedAt: new Date(),
    registeredSiteKey: site.key,
  });

  if (referredByMemberId) {
    await prisma.memberReferral.create({
      data: {
        inviterMemberId: referredByMemberId,
        invitedMemberId: member.id,
      },
    });
    await ensureWelcomeCouponForMember(member.id);
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  await linkMemberToCustomer(member.id);
  await createMemberSession(member.id);

  return { success: true, redirectTo: "/uye/hesabim" };
}

const RESERVATION_CREDENTIALS_ERROR =
  "E-posta veya rezervasyon kodu hatalı. Konfirme edilmiş rezervasyonunuz yoksa müşteri hizmetlerimizi arayın.";

async function sendMemberReservationOtp(
  phone: string,
  payload: MemberReservationOtpPayload
) {
  const rate = checkRateLimit({
    key: `member-otp:${phone}:${MEMBER_RESERVATION_OTP_PURPOSE}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return { error: "Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin." };
  }

  await invalidateActiveOtps(phone, MEMBER_RESERVATION_OTP_PURPOSE);
  const code = await createUniqueOtpCode(phone, MEMBER_RESERVATION_OTP_PURPOSE);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const delivery = await deliverOtpCode(
    phone,
    code,
    MEMBER_RESERVATION_OTP_PURPOSE,
    { brandName: site.brandName }
  );
  if (!delivery.ok) {
    return { error: delivery.error ?? "Doğrulama kodu gönderilemedi" };
  }

  const record = await prisma.verificationCode.create({
    data: {
      phone,
      code,
      purpose: MEMBER_RESERVATION_OTP_PURPOSE,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      payload,
      channel: delivery.channel,
    },
  });

  return {
    verificationId: record.id,
    channel: delivery.channel,
    phone: maskPhone(phone),
  };
}

export async function startMemberReservationLoginAction(
  formData: FormData
): Promise<MemberAuthState> {
  const email = normalizeMemberLoginEmail(String(formData.get("email") ?? ""));
  const reservationCode = parseMemberReservationCode(
    String(formData.get("reservationCode") ?? "")
  );

  if (!email.includes("@")) {
    return { error: "Geçerli bir e-posta girin" };
  }
  if (reservationCode == null) {
    return { error: RESERVATION_CREDENTIALS_ERROR };
  }

  const booking = await findMemberReservationBooking(email, reservationCode);
  if (!booking) {
    return { error: RESERVATION_CREDENTIALS_ERROR };
  }

  const otp = await sendMemberReservationOtp(booking.phone, {
    bookingId: booking.id,
    email,
    reservationCode: String(reservationCode),
  });
  if ("error" in otp) return { error: otp.error };

  return {
    success: true,
    needsVerification: true,
    verificationId: otp.verificationId,
    channel: otp.channel,
    phone: booking.phone,
    message: `Doğrulama kodu ${otp.phone} numarasına gönderildi`,
  };
}

export async function verifyMemberReservationLoginAction(input: {
  phone: string;
  code: string;
}): Promise<MemberAuthState> {
  const phone = normalizePhoneToE164(input.phone);
  if (!phone) return { error: "Geçersiz telefon" };

  const record = await prisma.verificationCode.findFirst({
    where: {
      phone,
      purpose: MEMBER_RESERVATION_OTP_PURPOSE,
      code: input.code.trim(),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { error: "Doğrulama kodu hatalı veya süresi dolmuş" };

  const payload = record.payload as MemberReservationOtpPayload | null;
  if (!payload?.bookingId) {
    return { error: "Doğrulama kaydı geçersiz" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
    },
  });
  if (!booking) return { error: "Rezervasyon bulunamadı" };

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  let member = await findMemberByPhoneOrEmail({
    phone,
    email: booking.guestEmail,
  });
  if (!member) {
    const company = await getCompanySettings();
    const site = await getPublicSiteProfile(company);
    member = await createMemberAccountWithLoyalty({
      fullName: booking.guestName,
      phone,
      email: booking.guestEmail,
      inviteCode: await generateUniqueInviteCode(),
      phoneVerifiedAt: new Date(),
      membershipAcceptedAt: new Date(),
      registeredSiteKey: site.key,
    });
  } else if (member.phone !== phone) {
    await alignMemberPhoneToE164(member.id, phone);
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { memberId: member.id },
  });
  await linkMemberToCustomer(member.id);
  await createMemberSession(member.id);

  return { success: true, redirectTo: "/uye/hesabim" };
}

export async function loginMemberWithEmailAction(
  formData: FormData
): Promise<MemberAuthState> {
  const parsed = emailLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };
  }

  const email = normalizeMemberEmail(parsed.data.email);
  const member = await prisma.memberAccount.findFirst({
    where: { email, active: true },
  });
  if (!member?.passwordHash) {
    return { error: "E-posta veya şifre hatalı" };
  }

  const valid = await bcrypt.compare(parsed.data.password, member.passwordHash);
  if (!valid) return { error: "E-posta veya şifre hatalı" };

  await linkMemberToCustomer(member.id);
  await createMemberSession(member.id);
  return { success: true, redirectTo: "/uye/hesabim" };
}

export async function logoutMemberAction() {
  await clearMemberSession();
  return { success: true };
}

export async function getMemberSessionAction() {
  const member = await getCurrentMember();
  if (!member) return { member: null };
  return {
    member: {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      inviteCode: member.inviteCode,
      loyaltyTier: member.loyaltyTier,
      couponBalance: member.couponBalance,
      completedStays: member.completedStays,
    },
  };
}
