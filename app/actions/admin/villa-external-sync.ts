"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import {
  isExternalSyncSlot,
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";

export type VillaExternalSyncActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

async function revalidateExternalSync(villaId: string) {
  revalidatePath("/admin/villalar");
  revalidatePath("/admin/konaklama/takvim");
  await revalidateVillaEditPage(villaId);
}

function parseSlot(slot: number): ExternalSyncSlot | null {
  return isExternalSyncSlot(slot) ? slot : null;
}

/** Harici sync linkini kaydet (Değiştir → Kaydet). */
export async function saveVillaExternalSyncUrlAction(
  villaId: string,
  slot: number,
  url: string
): Promise<VillaExternalSyncActionState> {
  await requireAdmin();

  const parsedSlot = parseSlot(slot);
  if (!parsedSlot) {
    return { error: "Geçersiz link slotu (1-4)" };
  }

  const result = await setVillaExternalSyncUrl(villaId, parsedSlot, url);
  if (!result.ok) {
    return { error: result.message };
  }

  await revalidateExternalSync(villaId);
  return { success: true, message: result.message };
}

/** Harici sync linkini temizle (Sil). */
export async function clearVillaExternalSyncUrlAction(
  villaId: string,
  slot: number
): Promise<VillaExternalSyncActionState> {
  return saveVillaExternalSyncUrlAction(villaId, slot, "");
}

/**
 * Link tipine göre hemen sync:
 * - .ics / iCal → mevcut iCal import
 * - tatildeyiz villa URL → period + occupancy import
 * - diğer http(s) villa sayfası → HTML scrape (fiyat + takvim overwrite)
 */
export async function syncVillaExternalSyncSlotAction(
  villaId: string,
  slot: number,
  urlOverride?: string
): Promise<VillaExternalSyncActionState> {
  await requireAdmin();

  const parsedSlot = parseSlot(slot);
  if (!parsedSlot) {
    return { error: "Geçersiz link slotu (1-4)" };
  }

  // Önce override URL varsa kaydet, sonra sync et
  if (typeof urlOverride === "string" && urlOverride.trim()) {
    const saved = await setVillaExternalSyncUrl(
      villaId,
      parsedSlot,
      urlOverride.trim()
    );
    if (!saved.ok) {
      return { error: saved.message };
    }
  }

  const result = await syncVillaExternalLinkSlot(villaId, parsedSlot, {
    urlOverride: urlOverride?.trim() || undefined,
  });

  await revalidateExternalSync(villaId);

  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true, message: result.message };
}
