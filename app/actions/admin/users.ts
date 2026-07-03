"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

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

const baseUserSchema = z.object({
  name: z.string().min(1, "Kullanıcı adı gerekli"),
  email: z.string().email("Geçerli bir e-posta girin"),
  phone: z.string(),
  role: z.nativeEnum(UserRole),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

const updateUserSchema = baseUserSchema;

export async function createAdminUser(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  await requireManager();

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    active: formData.get("active"),
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
    await prisma.user.create({
      data: {
        ...data,
        phone: normalizePhone(phone),
        passwordHash,
      },
    });
    revalidatePath("/admin/acente/kullanicilar");
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

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    active: formData.get("active"),
  });

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

    revalidatePath("/admin/acente/kullanicilar");
    return { success: true };
  } catch {
    return { error: "Kullanıcı güncellenirken bir hata oluştu" };
  }
}

export async function getCurrentUserRole() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role ?? null;
}
