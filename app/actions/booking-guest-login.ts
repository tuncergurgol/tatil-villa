"use server";

import { BookingStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { prisma } from "@/lib/db";
import { deliverOtpCode } from "@/lib/otp-delivery";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  BOOKING_GUEST_LOGIN_OTP_PURPOSE,
  OTP_TTL_MS,
  createUniqueOtpCode,
  invalidateActiveOtps,
  type BookingGuestLoginOtpPayload,
} from "@/lib/verification-otp";

export type BookingGuestLoginState = {
  success?: boolean;
  error?: string;
  message?: string;
  needsVerification?: boolean;
  phone?: string;
  verificationId?: string;
  channel?: "sms" | "whatsapp";
  redirectTo?: string;
};

const CREDENTIALS_ERROR =
  "E-posta veya rezervasyon kodu hatalı. Konfirme edilmiş rezervasyonunuz yoksa müşteri hizmetlerimizi arayın.";

const ALLOWED_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMATION_SENT,
  BookingStatus.CONFIRMED,
];

function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 7) return e164;
  return `****${digits.slice(-4)}`;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseReservationCode(value: string): number | null {
  const digits = value.trim().replace(/\s+/g, "");
  if (!/^\d{4,10}$/.test(digits)) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

async function findEligibleBooking(email: string, reservationCode: number) {
  const booking = await prisma.booking.findFirst({
    where: {
      externalCode: reservationCode,
      guestEmail: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      guestEmail: true,
      guestPhone: true,
      status: true,
      externalCode: true,
    },
  });

  if (!booking) return null;
  if (isImportedPlaceholderEmail(booking.guestEmail)) return null;
  if (!ALLOWED_STATUSES.includes(booking.status)) return null;

  const phone = normalizePhoneToE164(booking.guestPhone);
  if (!phone || !isValidTurkishMobileE164(phone)) return null;

  return { ...booking, phone };
}

const startSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  reservationCode: z.string().trim().min(4, "Rezervasyon kodunu girin"),
});

/**
 * E-posta + rezervasyon kodu → rezervasyon telefonuna 5 haneli WhatsApp OTP.
 */
export async function startBookingGuestLoginAction(
  _prev: BookingGuestLoginState,
  formData: FormData
): Promise<BookingGuestLoginState> {
  const parsed = startSchema.safeParse({
    email: formData.get("email"),
    reservationCode: formData.get("reservationCode"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const email = normalizeEmail(parsed.data.email);
  if (isImportedPlaceholderEmail(email)) {
    return { error: CREDENTIALS_ERROR };
  }

  const reservationCode = parseReservationCode(parsed.data.reservationCode);
  if (reservationCode == null) {
    return { error: CREDENTIALS_ERROR };
  }

  const booking = await findEligibleBooking(email, reservationCode);
  if (!booking) {
    return { error: CREDENTIALS_ERROR };
  }

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  const payload: BookingGuestLoginOtpPayload = {
    bookingId: booking.id,
    email,
    reservationCode: String(reservationCode),
  };

  await invalidateActiveOtps(booking.phone, BOOKING_GUEST_LOGIN_OTP_PURPOSE);
  const code = await createUniqueOtpCode(
    booking.phone,
    BOOKING_GUEST_LOGIN_OTP_PURPOSE
  );
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const delivery = await deliverOtpCode(
    booking.phone,
    code,
    BOOKING_GUEST_LOGIN_OTP_PURPOSE,
    { brandName: site.brandName }
  );
  if (!delivery.ok) {
    return { error: delivery.error ?? "Doğrulama kodu gönderilemedi" };
  }

  const record = await prisma.verificationCode.create({
    data: {
      phone: booking.phone,
      code,
      purpose: BOOKING_GUEST_LOGIN_OTP_PURPOSE,
      expiresAt,
      channel: delivery.channel,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    needsVerification: true,
    phone: booking.phone,
    verificationId: record.id,
    channel: delivery.channel,
    message: `Doğrulama kodu ${
      delivery.channel === "sms" ? "SMS" : "WhatsApp"
    } ile ${maskPhone(booking.phone)} numarasına gönderildi.`,
  };
}

const verifySchema = z.object({
  verificationId: z.string().min(1),
  phone: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "5 haneli doğrulama kodunu girin"),
});

/**
 * OTP doğrula → giriş bilgilendirme sayfasına yönlendir.
 */
export async function verifyBookingGuestLoginAction(
  _prev: BookingGuestLoginState,
  formData: FormData
): Promise<BookingGuestLoginState> {
  const parsed = verifySchema.safeParse({
    verificationId: formData.get("verificationId"),
    phone: formData.get("phone"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz doğrulama",
      needsVerification: true,
      phone: String(formData.get("phone") ?? ""),
      verificationId: String(formData.get("verificationId") ?? ""),
    };
  }

  const e164 = normalizePhoneToE164(parsed.data.phone);
  const record = await prisma.verificationCode.findFirst({
    where: {
      id: parsed.data.verificationId,
      phone: e164,
      purpose: BOOKING_GUEST_LOGIN_OTP_PURPOSE,
    },
  });

  if (!record) {
    return {
      error: "Doğrulama kaydı bulunamadı. Bilgilerinizi yeniden girin.",
    };
  }

  if (record.usedAt) {
    return {
      error: "Bu kod zaten kullanıldı. Bilgilerinizi yeniden girin.",
    };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return {
      error: "Kodun süresi doldu. Bilgilerinizi yeniden girin.",
    };
  }

  if (record.code !== parsed.data.code.trim()) {
    return {
      error: "Doğrulama kodu hatalı",
      needsVerification: true,
      phone: record.phone,
      verificationId: record.id,
      channel: record.channel === "sms" ? "sms" : "whatsapp",
    };
  }

  const payload = record.payload as BookingGuestLoginOtpPayload | null;
  const bookingId = payload?.bookingId?.trim();
  if (!bookingId) {
    return { error: "Doğrulama kaydı geçersiz. Bilgilerinizi yeniden girin." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking || !ALLOWED_STATUSES.includes(booking.status)) {
    return {
      error:
        "Rezervasyon giriş için uygun değil. Müşteri hizmetlerimizi arayın.",
    };
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return {
    success: true,
    message: "Doğrulama başarılı",
    redirectTo: `/giris-bilgilendirme/${booking.id}`,
  };
}

/** Aynı doğrulama kaydı için kodu yeniden gönder */
export async function resendBookingGuestLoginOtpAction(
  _prev: BookingGuestLoginState,
  formData: FormData
): Promise<BookingGuestLoginState> {
  const verificationId = String(formData.get("verificationId") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const e164 = normalizePhoneToE164(phoneRaw);

  if (!verificationId || !e164) {
    return { error: "Doğrulama oturumu bulunamadı" };
  }

  const existing = await prisma.verificationCode.findFirst({
    where: {
      id: verificationId,
      phone: e164,
      purpose: BOOKING_GUEST_LOGIN_OTP_PURPOSE,
    },
  });

  if (!existing || existing.usedAt) {
    return { error: "Doğrulama oturumu geçersiz. Bilgilerinizi yeniden girin." };
  }

  const payload = existing.payload as BookingGuestLoginOtpPayload | null;
  if (!payload?.bookingId) {
    return { error: "Doğrulama oturumu geçersiz. Bilgilerinizi yeniden girin." };
  }

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  await invalidateActiveOtps(e164, BOOKING_GUEST_LOGIN_OTP_PURPOSE);
  const code = await createUniqueOtpCode(e164, BOOKING_GUEST_LOGIN_OTP_PURPOSE);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const delivery = await deliverOtpCode(
    e164,
    code,
    BOOKING_GUEST_LOGIN_OTP_PURPOSE,
    { brandName: site.brandName }
  );
  if (!delivery.ok) {
    return { error: delivery.error ?? "Doğrulama kodu gönderilemedi" };
  }

  const record = await prisma.verificationCode.create({
    data: {
      phone: e164,
      code,
      purpose: BOOKING_GUEST_LOGIN_OTP_PURPOSE,
      expiresAt,
      channel: delivery.channel,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    needsVerification: true,
    phone: e164,
    verificationId: record.id,
    channel: delivery.channel,
    message: `Yeni doğrulama kodu ${
      delivery.channel === "sms" ? "SMS" : "WhatsApp"
    } ile ${maskPhone(e164)} numarasına gönderildi.`,
  };
}
