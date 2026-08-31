"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { setupVillaFromExternalUrl } from "@/lib/external-villa-setup-runner";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";

export type ExternalVillaSetupActionResult =
  | {
      success: true;
      created: boolean;
      name: string;
      editPath: string;
      imageCount: number;
      distanceCount: number;
      periodCount: number;
      bookedDays: number;
      optionDays: number;
      roomCount: number;
      documentNo: string;
      link1: string;
      published: boolean;
      warnings: string[];
    }
  | { success: false; error: string };

export async function setupVillaFromExternalUrlAction(
  pageUrl: string,
  name?: string,
  googleDriveUrl?: string
): Promise<ExternalVillaSetupActionResult> {
  await requireAdmin();

  try {
    const result = await setupVillaFromExternalUrl(pageUrl, {
      name: name?.trim() || undefined,
      googleDriveUrl: googleDriveUrl?.trim() || undefined,
      publish: true,
    });
    await revalidateVillaEditPage(result.villaId);
    revalidatePath("/admin/villalar");
    revalidatePath("/admin/konaklama/ayarlar/dis-siteden-kur");
    revalidatePath("/admin/acente/takvim-fiyat-aktarim");

    return {
      success: true,
      created: result.created,
      name: result.name,
      editPath: result.editPath,
      imageCount: result.imageCount,
      distanceCount: result.distanceCount,
      periodCount: result.periodCount,
      bookedDays: result.bookedDays,
      optionDays: result.optionDays,
      roomCount: result.roomCount,
      documentNo: result.documentNo,
      link1: result.link1,
      published: result.published,
      warnings: result.warnings,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Villa kurulumu tamamlanamadı",
    };
  }
}
