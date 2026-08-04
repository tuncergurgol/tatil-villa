"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3, "Kupon kodu en az 3 karakter olmalı"),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().min(1),
  minBookingMultiplier: z.coerce.number().min(1).default(10),
  maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
  usageLimit: z.coerce.number().min(1).optional().nullable(),
  memberOnly: z.enum(["true", "false"]).transform((v) => v === "true"),
  welcomeCoupon: z.enum(["true", "false"]).transform((v) => v === "true"),
  siteKey: z.string().optional().nullable(),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
});

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function parseOptionalDate(value?: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveAdminCouponAction(formData: FormData) {
  await requireAdmin();

  const parsed = couponSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minBookingMultiplier: formData.get("minBookingMultiplier") || "10",
    maxDiscountAmount: formData.get("maxDiscountAmount") || null,
    usageLimit: formData.get("usageLimit") || null,
    memberOnly: formData.get("memberOnly") ?? "false",
    welcomeCoupon: formData.get("welcomeCoupon") ?? "false",
    siteKey: formData.get("siteKey")?.toString() || null,
    active: formData.get("active") ?? "true",
    validFrom: formData.get("validFrom")?.toString() || null,
    validTo: formData.get("validTo")?.toString() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const code = normalizeCode(parsed.data.code);
  const duplicate = await prisma.coupon.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      ...(parsed.data.id ? { NOT: { id: parsed.data.id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return { error: "Bu kupon kodu zaten kayıtlı" };
  }

  const data = {
    code,
    discountType: parsed.data.discountType,
    discountValue: Math.round(parsed.data.discountValue),
    minBookingMultiplier: parsed.data.minBookingMultiplier,
    maxDiscountAmount:
      parsed.data.maxDiscountAmount != null
        ? Math.round(parsed.data.maxDiscountAmount)
        : null,
    usageLimit:
      parsed.data.usageLimit != null
        ? Math.round(parsed.data.usageLimit)
        : null,
    memberOnly: parsed.data.memberOnly,
    welcomeCoupon: parsed.data.welcomeCoupon,
    siteKey: parsed.data.siteKey?.trim() || null,
    active: parsed.data.active,
    validFrom: parseOptionalDate(parsed.data.validFrom),
    validTo: parseOptionalDate(parsed.data.validTo),
  };

  if (parsed.data.id) {
    await prisma.coupon.update({
      where: { id: parsed.data.id },
      data,
    });
  } else {
    await prisma.coupon.create({ data });
  }

  revalidatePath("/admin/musteri-yonetimi/kuponlar");
  return { success: true };
}

export async function deleteAdminCouponAction(id: string) {
  await requireAdmin();
  if (!id.trim()) return { error: "Kupon bulunamadı" };

  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/admin/musteri-yonetimi/kuponlar");
  return { success: true };
}
