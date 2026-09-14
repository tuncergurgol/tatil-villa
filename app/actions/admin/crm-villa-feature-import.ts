"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  importCrmVillaFeatures,
  previewCrmVillaFeatures,
} from "@/lib/crm-villa-feature-import";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "İşlem başarısız oldu.";
}

export async function previewCrmVillaFeaturesAction(villaId: string) {
  await requireAdmin();
  try {
    return { ok: true as const, preview: await previewCrmVillaFeatures(villaId) };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}

export async function importCrmVillaFeaturesAction(villaId: string) {
  await requireAdmin();
  try {
    const result = await importCrmVillaFeatures(villaId);
    revalidatePath("/");
    revalidatePath("/villalar");
    revalidatePath("/admin/villalar");
    revalidatePath("/admin/konaklama/ayarlar/ozellikleri-aktar");
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
