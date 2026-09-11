"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type AgencySiteActionState = {
  success?: boolean;
  error?: string;
};

function normalizeDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

const itemSchema = z.object({
  name: z.string().min(1, "Site adı gerekli"),
  domain: z
    .string()
    .min(1, "Domain adı gerekli")
    .transform((value) => normalizeDomain(value))
    .refine((value) => value.includes("."), "Geçerli bir domain girin"),
});

function revalidatePaths() {
  revalidatePath("/admin/acente/sirket");
  revalidatePath("/admin/konaklama/rezervasyonlar");
}

export async function createAgencySite(
  _prev: AgencySiteActionState,
  formData: FormData
): Promise<AgencySiteActionState> {
  await requireAdmin();

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const maxSort = await prisma.agencySite.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.agencySite.create({
      data: {
        name: parsed.data.name.trim(),
        domain: parsed.data.domain,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt oluşturulamadı" };
  }
}

export async function updateAgencySite(
  _prev: AgencySiteActionState,
  formData: FormData
): Promise<AgencySiteActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
  });
  if (!id || !parsed.success) {
    return {
      error: parsed.success
        ? "Geçersiz form verisi"
        : (parsed.error.issues[0]?.message ?? "Geçersiz form verisi"),
    };
  }

  try {
    await prisma.agencySite.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        domain: parsed.data.domain,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }
}

export async function deleteAgencySite(
  id: string
): Promise<AgencySiteActionState> {
  await requireAdmin();

  try {
    await prisma.agencySite.delete({
      where: { id },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt silinemedi" };
  }
}

export async function setAgencySiteActive(
  id: string,
  active: boolean
): Promise<AgencySiteActionState> {
  await requireAdmin();

  try {
    await prisma.agencySite.update({
      where: { id },
      data: { active },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Durum güncellenemedi" };
  }
}
