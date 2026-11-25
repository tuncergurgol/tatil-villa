"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { recordAdminAuditEvent } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { getActiveSalesRepOptions } from "@/lib/queries/users";

export type UserActionState = {
  success?: boolean;
  error?: string;
};

async function requireManager() {
  const session = await requireAdmin();
  if ((session.user as { role?: string }).role !== UserRole.ADMIN) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir");
  }
  return session;
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+90")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("90")) return `+${digits}`;
  if (digits.startsWith("0")) return `+90${digits.slice(1)}`;
  return `+90${digits}`;
}

function parseSalesCommissionRate(raw: unknown): number {
  if (raw == null) return 0;
  const text = String(raw).trim().replace("%", "").replace(",", ".");
  if (!text) return 0;
  const value = Number(text);
  if (!Number.isFinite(value)) {
    throw new Error("Satış prim oranı sayısal olmalıdır");
  }
  if (value < 0 || value > 100) {
    throw new Error("Satış prim oranı %0 ile %100 arasında olmalıdır");
  }
  return Math.round(value * 100) / 100;
}

const baseUserSchema = z.object({
  name: z.string().min(1, "Kullanıcı adı gerekli"),
  email: z.string().email("Geçerli bir e-posta girin"),
  phone: z.string(),
  role: z.nativeEnum(UserRole),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
  salesCommissionRate: z.number().min(0).max(100),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

const updateUserSchema = baseUserSchema;

function parseUserForm(formData: FormData) {
  let salesCommissionRate = 0;
  try {
    salesCommissionRate = parseSalesCommissionRate(
      formData.get("salesCommissionRate")
    );
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Geçersiz satış prim oranı",
    } as const;
  }

  return {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    active: formData.get("active"),
    salesCommissionRate,
  };
}

export async function createAdminUser(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  await requireManager();

  const raw = parseUserForm(formData);
  if ("error" in raw) return { error: raw.error };

  const parsed = createUserSchema.safeParse({
    ...raw,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const { password, phone, ...data } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return { error: "Bu e-posta adresi zaten kayıtlı" };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        ...data,
        phone: normalizePhone(phone),
        passwordHash,
      },
    });
    await recordAdminAuditEvent({
      action: "user_created",
      userId: created.id,
      email: created.email,
      ip: await getRequestClientIp(),
      meta: { role: created.role, active: created.active },
    });
    revalidatePath("/admin/acente/kullanicilar");
    revalidatePath("/admin/acente/guvenlik");
    revalidatePath("/admin/rezervasyonlar");
    return { success: true };
  } catch {
    return { error: "Kullanıcı oluşturulurken bir hata oluştu" };
  }
}

export async function updateAdminUser(
  userId: string,
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const session = await requireManager();

  const raw = parseUserForm(formData);
  if ("error" in raw) return { error: raw.error };

  const parsed = updateUserSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const password = ((formData.get("password") as string | null) ?? "").trim();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "Kullanıcı bulunamadı" };
  }

  const { phone, active, ...data } = parsed.data;

  if (session.user?.id === userId && !active) {
    return { error: "Kendi hesabınızı pasif yapamazsınız" };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: userId } },
  });
  if (emailTaken) {
    return { error: "Bu e-posta adresi başka bir kullanıcıda kayıtlı" };
  }

  try {
    const updateData: {
      name: string;
      email: string;
      phone: string;
      role: UserRole;
      active: boolean;
      salesCommissionRate: number;
      passwordHash?: string;
    } = {
      ...data,
      phone: normalizePhone(phone),
      active,
    };

    if (password && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    } else if (password && password.length > 0) {
      return { error: "Şifre en az 6 karakter olmalı" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await recordAdminAuditEvent({
      action: "user_updated",
      userId,
      email: data.email,
      ip: await getRequestClientIp(),
      meta: {
        role: data.role,
        active,
        passwordChanged: Boolean(updateData.passwordHash),
      },
    });

    revalidatePath("/admin/acente/kullanicilar");
    revalidatePath("/admin/acente/guvenlik");
    revalidatePath("/admin/rezervasyonlar");
    return { success: true };
  } catch {
    return { error: "Kullanıcı güncellenirken bir hata oluştu" };
  }
}

export async function getCurrentUserRole() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role ?? null;
}

export async function getActiveSalesRepOptionsAction() {
  await requireAdmin();
  return getActiveSalesRepOptions();
}
