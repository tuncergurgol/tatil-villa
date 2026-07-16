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
