"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { OTELZ_DEFAULT_AFFILIATE, OTELZ_PUBLIC_ROUTE } from "@/lib/otelz";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/queries/company-settings";

export type OtelzSettingsActionState = {
  success?: boolean;
  error?: string;
};

const schema = z.object({
  otelzEnabled: z.coerce.boolean(),
  otelzAffiliateTo: z
    .string()
    .trim()
    .min(1, "Affiliate to gerekli")
    .regex(/^\d+$/, "Affiliate to yalnızca rakam olmalı"),
  otelzAffiliateCid: z
    .string()
    .trim()
    .min(1, "Affiliate cid gerekli")
    .regex(/^\d+$/, "Affiliate cid yalnızca rakam olmalı"),
});

export async function saveOtelzSettings(
  _prev: OtelzSettingsActionState,
  formData: FormData
): Promise<OtelzSettingsActionState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    otelzEnabled: formData.get("otelzEnabled") === "on",
    otelzAffiliateTo:
      String(formData.get("otelzAffiliateTo") ?? "").trim() ||
      OTELZ_DEFAULT_AFFILIATE.to,
    otelzAffiliateCid:
      String(formData.get("otelzAffiliateCid") ?? "").trim() ||
      OTELZ_DEFAULT_AFFILIATE.cid,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      otelzEnabled: parsed.data.otelzEnabled,
      otelzAffiliateTo: parsed.data.otelzAffiliateTo,
      otelzAffiliateCid: parsed.data.otelzAffiliateCid,
    },
    update: {
      otelzEnabled: parsed.data.otelzEnabled,
      otelzAffiliateTo: parsed.data.otelzAffiliateTo,
      otelzAffiliateCid: parsed.data.otelzAffiliateCid,
    },
  });

  revalidatePath("/admin/otelz");
  revalidatePath(OTELZ_PUBLIC_ROUTE);
  return { success: true };
}
