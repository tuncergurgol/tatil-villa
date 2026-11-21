"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/queries/company-settings";

export type WhatsappOtpToggleState = {
  success?: boolean;
  error?: string;
  enabled?: boolean;
};

function revalidateOtpTogglePages() {
  revalidatePath("/admin/acente/bildirim-whatsapp");
  revalidatePath("/admin/acente/guvenlik");
  revalidatePath("/admin/acente/sirket");
}

export async function setWhatsappOtpEnabledAction(
  enabled: boolean
): Promise<WhatsappOtpToggleState> {
  await requireAdmin();

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      whatsappOtpEnabled: enabled,
    },
    update: { whatsappOtpEnabled: enabled },
  });

  revalidateOtpTogglePages();
  return { success: true, enabled };
}
