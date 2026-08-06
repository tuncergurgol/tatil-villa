"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type {
  CallbackPreferredDay,
  CallbackPreferredTime,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { deliverOtpCode } from "@/lib/otp-delivery";
import { notifyNewCallbackRequest } from "@/lib/callback-request-notify";
import { syncCustomerFromCallback } from "@/lib/customer-crm";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import {
  CALLBACK_OTP_PURPOSE,
  OTP_TTL_MS,
  createUniqueOtpCode,
  invalidateActiveOtps,
  type CallbackRequestOtpPayload,
} from "@/lib/verification-otp";

export type CallbackRequestActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  /** OTP adımına geçildi */
  needsVerification?: boolean;
  phone?: string;
  verificationId?: string;
  channel?: "sms" | "whatsapp";
};

const formSchema = z.object({
  name: z.string().trim().min(2, "Adınız gerekli"),
  phone: z
    .string()
    .trim()
    .min(10, "Geçerli bir telefon girin")
    .max(20, "Telefon çok uzun"),
  note: z.string().trim().max(2000).optional(),
  preferredDay: z.enum(["TODAY", "TOMORROW", "THIS_WEEK", "ANY"]),
  preferredTime: z.enum(["ASAP", "MORNING", "AFTERNOON", "EVENING"]),
  consent: z.boolean(),
});

function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 7) return e164;
  return `****${digits.slice(-4)}`;
}

/**
 * Form gönderimi: 5 haneli OTP üretir, WhatsApp (veya SMS) ile gönderir.
 * CallbackRequest henüz oluşmaz; doğrulamadan sonra oluşur.
 */
export async function submitCallbackRequestAction(
  _prev: CallbackRequestActionState,
  formData: FormData
): Promise<CallbackRequestActionState> {
  const parsed = formSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    note: String(formData.get("note") ?? "").trim() || undefined,
    preferredDay: formData.get("preferredDay") || "ANY",
    preferredTime: formData.get("preferredTime") || "ASAP",
    consent: formData.get("consent") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  if (!parsed.data.consent) {
    return { error: "İletişim onayını kabul etmeniz gerekir" };
  }

  const e164 = normalizePhoneToE164(parsed.data.phone);
  if (!e164 || !isValidTurkishMobileE164(e164)) {
    return { error: "Geçerli bir cep telefonu girin (05xx…)" };
  }

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  const payload: CallbackRequestOtpPayload = {
    name: parsed.data.name,
    phone: e164,
    note: parsed.data.note ?? "",
    preferredDay: parsed.data.preferredDay,
    preferredTime: parsed.data.preferredTime,
    sourceSite: site.brandName,
    sourceDomain: site.domain,
  };

  await invalidateActiveOtps(e164, CALLBACK_OTP_PURPOSE);

  const code = await createUniqueOtpCode(e164, CALLBACK_OTP_PURPOSE);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const delivery = await deliverOtpCode(e164, code, CALLBACK_OTP_PURPOSE);
  if (!delivery.ok) {
    return { error: delivery.error ?? "Doğrulama kodu gönderilemedi" };
  }

  const record = await prisma.verificationCode.create({
    data: {
      phone: e164,
      code,
      purpose: CALLBACK_OTP_PURPOSE,
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
    message: `Doğrulama kodu ${
      delivery.channel === "sms" ? "SMS" : "WhatsApp"
    } ile ${maskPhone(e164)} numarasına gönderildi.`,
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
 * OTP doğrula → CallbackRequest VERIFIED olarak admin listesine düşer.
 */
export async function verifyCallbackRequestOtpAction(
  _prev: CallbackRequestActionState,
  formData: FormData
): Promise<CallbackRequestActionState> {
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
      purpose: CALLBACK_OTP_PURPOSE,
    },
  });

  if (!record) {
    return {
      error: "Doğrulama kaydı bulunamadı. Formu yeniden gönderin.",
    };
  }

  if (record.usedAt) {
    return {
      error: "Bu kod zaten kullanıldı. Formu yeniden gönderin.",
    };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return {
      error: "Kodun süresi doldu. Formu yeniden gönderin.",
      needsVerification: true,
      phone: e164,
      verificationId: record.id,
    };
  }

  if (record.code !== parsed.data.code) {
    return {
      error: "Doğrulama kodu hatalı",
      needsVerification: true,
      phone: e164,
      verificationId: record.id,
      channel: record.channel === "sms" ? "sms" : "whatsapp",
    };
  }

  const payload = record.payload as CallbackRequestOtpPayload | null;
  if (!payload?.name || !payload?.phone) {
    return { error: "Form verisi okunamadı. Lütfen tekrar deneyin." };
  }

  const now = new Date();
  let createdRecord: {
    name: string;
    phone: string;
    note: string;
    preferredDay: CallbackPreferredDay;
    preferredTime: CallbackPreferredTime;
    sourceSite: string;
    sourceDomain: string;
  } | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.verificationCode.update({
      where: { id: record.id },
      data: { usedAt: now },
    });

    const item = await tx.callbackRequest.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        note: payload.note ?? "",
        preferredDay: payload.preferredDay as CallbackPreferredDay,
        preferredTime: payload.preferredTime as CallbackPreferredTime,
        sourceSite: payload.sourceSite ?? "",
        sourceDomain: payload.sourceDomain ?? "",
        status: "VERIFIED",
        verifiedAt: now,
      },
    });
    createdRecord = item;
  });

  if (createdRecord) {
    await syncCustomerFromCallback({
      name: payload.name,
      phone: payload.phone,
      firstContactAt: now,
    });
    await notifyNewCallbackRequest(createdRecord);
  }

  revalidatePath("/admin/acente/sizi-arayalim");
  revalidatePath("/sizi-arayalim");

  return {
    success: true,
    message:
      "Telefonunuz doğrulandı. Talebiniz alındı — en kısa sürede sizi arayacağız.",
  };
}

/** Aynı doğrulama kaydı için kodu yeniden gönder */
export async function resendCallbackRequestOtpAction(
  _prev: CallbackRequestActionState,
  formData: FormData
): Promise<CallbackRequestActionState> {
  const verificationId = String(formData.get("verificationId") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const e164 = normalizePhoneToE164(phoneRaw);

  if (!verificationId || !e164) {
    return { error: "Yeniden gönderim için oturum bulunamadı" };
  }

  const existing = await prisma.verificationCode.findFirst({
    where: {
      id: verificationId,
      phone: e164,
      purpose: CALLBACK_OTP_PURPOSE,
    },
  });

  if (!existing || existing.usedAt) {
    return { error: "Formu yeniden doldurmanız gerekiyor" };
  }

  const payload = existing.payload as CallbackRequestOtpPayload | null;
  if (!payload) {
    return { error: "Form verisi bulunamadı" };
  }

  await invalidateActiveOtps(e164, CALLBACK_OTP_PURPOSE);

  const code = await createUniqueOtpCode(e164, CALLBACK_OTP_PURPOSE);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const delivery = await deliverOtpCode(e164, code, CALLBACK_OTP_PURPOSE);

  if (!delivery.ok) {
    return {
      error: delivery.error ?? "Kod gönderilemedi",
      needsVerification: true,
      phone: e164,
      verificationId,
    };
  }

  const record = await prisma.verificationCode.create({
    data: {
      phone: e164,
      code,
      purpose: CALLBACK_OTP_PURPOSE,
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
    message: `Yeni kod ${
      delivery.channel === "sms" ? "SMS" : "WhatsApp"
    } ile gönderildi.`,
  };
}
