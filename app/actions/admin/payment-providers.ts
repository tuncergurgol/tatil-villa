"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import type { PaymentProviderFieldDef } from "@/lib/queries/payment-providers";

export type PaymentProviderActionState = {
  success?: boolean;
  error?: string;
};

export type PaymentProviderTestResult = {
  ok: boolean;
  message: string;
};

const slugSchema = z
  .string()
  .trim()
  .min(1, "Teknik ad gerekli")
  .regex(/^[a-z0-9-]+$/, "Teknik ad sadece küçük harf, sayı ve tire içerebilir");

const fieldDefSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(["text", "password"]),
  required: z.boolean(),
});

function revalidatePaths() {
  revalidatePath("/admin/acente/sirket");
}

function parseFieldsJson(raw: string): PaymentProviderFieldDef[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: PaymentProviderFieldDef[] = [];
  for (const item of parsed) {
    const check = fieldDefSchema.safeParse(item);
    if (check.success) result.push(check.data);
  }
  return result;
}

export async function createPaymentProvider(
  _prev: PaymentProviderActionState,
  formData: FormData
): Promise<PaymentProviderActionState> {
  await requireAdmin();

  const slugParsed = slugSchema.safeParse(formData.get("slug"));
  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") === "on";
  const fieldsRaw = String(formData.get("fieldsJson") ?? "[]");

  if (!slugParsed.success) {
    return { error: slugParsed.error.issues[0]?.message ?? "Geçersiz teknik ad" };
  }
  if (!name) {
    return { error: "Görünen ad gerekli" };
  }

  const fields = parseFieldsJson(fieldsRaw);
  if (fields.length === 0) {
    return { error: "En az bir API alanı tanımlamalısınız" };
  }

  try {
    const existing = await prisma.paymentProvider.findUnique({
      where: { slug: slugParsed.data },
    });
    if (existing) {
      return { error: "Bu teknik ad zaten kullanılıyor" };
    }

    const maxSort = await prisma.paymentProvider.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.paymentProvider.create({
      data: {
        slug: slugParsed.data,
        name,
        active,
        isDefault: false,
        mode: "test",
        fields: fields as unknown as Prisma.InputJsonValue,
        credentials: {} as Prisma.InputJsonValue,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Provider oluşturulamadı" };
  }
}

export async function updatePaymentProviderConfig(
  _prev: PaymentProviderActionState,
  formData: FormData
): Promise<PaymentProviderActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Geçersiz kayıt" };
  }

  const active = formData.get("active") === "on";
  const isDefault = formData.get("isDefault") === "on";
  const mode = formData.get("mode") === "live" ? "live" : "test";

  try {
    const provider = await prisma.paymentProvider.findUnique({ where: { id } });
    if (!provider) {
      return { error: "Provider bulunamadı" };
    }

    const fieldDefs = Array.isArray(provider.fields)
      ? (provider.fields as unknown as PaymentProviderFieldDef[])
      : [];
    const existingCredentials =
      provider.credentials && typeof provider.credentials === "object"
        ? (provider.credentials as Record<string, string>)
        : {};

    const nextCredentials: Record<string, string> = { ...existingCredentials };
    for (const field of fieldDefs) {
      const submitted = formData.get(`cred_${field.key}`);
      if (typeof submitted === "string" && submitted.trim().length > 0) {
        nextCredentials[field.key] = submitted.trim();
      }
    }

    if (isDefault) {
      await prisma.paymentProvider.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.paymentProvider.update({
      where: { id },
      data: {
        active,
        isDefault,
        mode,
        credentials: nextCredentials as Prisma.InputJsonValue,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Yapılandırma kaydedilemedi" };
  }
}

export async function testPaymentProviderConfig(
  id: string
): Promise<PaymentProviderTestResult> {
  await requireAdmin();

  const provider = await prisma.paymentProvider.findUnique({ where: { id } });
  if (!provider) {
    return { ok: false, message: "Provider bulunamadı" };
  }

  const fieldDefs = Array.isArray(provider.fields)
    ? (provider.fields as unknown as PaymentProviderFieldDef[])
    : [];
  const credentials =
    provider.credentials && typeof provider.credentials === "object"
      ? (provider.credentials as Record<string, string>)
      : {};

  const missing = fieldDefs.filter(
    (field) => field.required && !credentials[field.key]?.trim()
  );

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Eksik alanlar: ${missing.map((f) => f.label).join(", ")}`,
    };
  }

  return {
    ok: true,
    message: "Yapılandırma eksiksiz görünüyor. (Not: Bu test gerçek bir ödeme sağlayıcı API çağrısı yapmaz, sadece gerekli alanların dolu olduğunu doğrular.)",
  };
}

export async function deletePaymentProvider(
  id: string
): Promise<PaymentProviderActionState> {
  await requireAdmin();

  try {
    await prisma.paymentProvider.delete({ where: { id } });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Provider silinemedi" };
  }
}
