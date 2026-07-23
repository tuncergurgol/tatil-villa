"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  DEFAULT_COMPANY_SETTINGS,
} from "@/lib/queries/company-settings";
import { BILETALL_DEFAULT_PORTAL_SLUG } from "@/lib/biletall";

export type BiletallSettingsActionState = {
  success?: boolean;
  error?: string;
};

const schema = z.object({
  biletallEnabled: z.coerce.boolean(),
  biletallPortalSlug: z
    .string()
    .trim()
    .min(1, "Portal slug gerekli")
    .regex(/^[a-z0-9_-]+$/i, "Portal slug yalnızca harf, rakam, _ ve - içerebilir"),
});

export async function saveBiletallSettings(
  _prev: BiletallSettingsActionState,
  formData: FormData
): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    biletallEnabled: formData.get("biletallEnabled") === "on",
    biletallPortalSlug:
      String(formData.get("biletallPortalSlug") ?? "").trim() ||
      BILETALL_DEFAULT_PORTAL_SLUG,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      biletallEnabled: parsed.data.biletallEnabled,
      biletallPortalSlug: parsed.data.biletallPortalSlug.toLowerCase(),
    },
    update: {
      biletallEnabled: parsed.data.biletallEnabled,
      biletallPortalSlug: parsed.data.biletallPortalSlug.toLowerCase(),
    },
  });

  revalidatePath("/admin/obilet");
  revalidatePath("/ucak-otobus");
  revalidatePath("/bilet/ara");
  revalidatePath("/bilet/satinal");
  revalidatePath("/bilet/sonuc");

  return { success: true };
}

const credentialsSchema = z.object({
  biletallUsername: z.string().trim().max(200),
  biletallPassword: z.string().max(200),
  clearPassword: z.coerce.boolean().optional(),
});

export async function saveBiletallCredentials(
  _prev: BiletallSettingsActionState,
  formData: FormData
): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const parsed = credentialsSchema.safeParse({
    biletallUsername: String(formData.get("biletallUsername") ?? ""),
    biletallPassword: String(formData.get("biletallPassword") ?? ""),
    clearPassword: formData.get("clearPassword") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const update: {
    biletallUsername: string;
    biletallPassword?: string;
  } = {
    biletallUsername: parsed.data.biletallUsername,
  };

  if (parsed.data.clearPassword) {
    update.biletallPassword = "";
  } else if (parsed.data.biletallPassword.trim()) {
    update.biletallPassword = parsed.data.biletallPassword;
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      ...update,
    },
    update,
  });

  revalidatePath("/admin/obilet");
  revalidatePath("/ucak-otobus");
  revalidatePath("/bilet/ara");
  revalidatePath("/bilet/satinal");
  revalidatePath("/bilet/sonuc");

  return { success: true };
}
