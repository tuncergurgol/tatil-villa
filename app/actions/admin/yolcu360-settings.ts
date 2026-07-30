"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  cancelYolcu360Order,
  clearYolcu360TokenCache,
  getYolcu360Order,
  testYolcu360Connection,
} from "@/lib/yolcu360/client";
import {
  parseCommissionPercentageInput,
} from "@/lib/yolcu360/commission";
import { DEFAULT_YOLCU360_SETTINGS } from "@/lib/yolcu360/settings";
import { syncYolcu360OrderStatus, upsertYolcu360OrderFromApi } from "@/lib/yolcu360/orders-db";

export type Yolcu360SettingsActionState = {
  success?: boolean;
  error?: string;
  testOk?: boolean;
};

const settingsSchema = z.object({
  enabled: z.coerce.boolean(),
  publicEnabled: z.coerce.boolean(),
  environment: z.enum(["staging", "production"]),
  commissionType: z.enum(["percentage"]),
  commissionPercentage: z.coerce.number().min(0).max(100),
  defaultPaymentType: z.enum(["creditCard", "limit"]),
});

const credentialsSchema = z.object({
  apiKey: z.string().trim().max(200),
  apiSecret: z.string().max(200),
  clearSecret: z.coerce.boolean().optional(),
});

function revalidateYolcu360Paths() {
  revalidatePath("/admin/yolcu360");
  revalidatePath("/admin/yolcu360/siparisler");
  revalidatePath("/arac-kiralama");
}

export async function saveYolcu360Settings(
  _prev: Yolcu360SettingsActionState,
  formData: FormData
): Promise<Yolcu360SettingsActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    publicEnabled: formData.get("publicEnabled") === "on",
    environment: formData.get("environment"),
    commissionType: formData.get("commissionType") ?? "percentage",
    commissionPercentage: parseCommissionPercentageInput(
      formData.get("commissionPercentage")
    ),
    defaultPaymentType: formData.get("defaultPaymentType") ?? "creditCard",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz ayar" };
  }

  await prisma.yolcu360Settings.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_YOLCU360_SETTINGS, ...parsed.data },
    update: parsed.data,
  });

  clearYolcu360TokenCache();
  revalidateYolcu360Paths();
  return { success: true };
}

export async function saveYolcu360Credentials(
  _prev: Yolcu360SettingsActionState,
  formData: FormData
): Promise<Yolcu360SettingsActionState> {
  await requireAdmin();

  const parsed = credentialsSchema.safeParse({
    apiKey: formData.get("apiKey"),
    apiSecret: formData.get("apiSecret"),
    clearSecret: formData.get("clearSecret") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz kimlik bilgisi" };
  }

  const existing = await prisma.yolcu360Settings.findUnique({
    where: { id: "default" },
    select: { apiSecret: true },
  });

  const apiSecret = parsed.data.clearSecret
    ? ""
    : parsed.data.apiSecret.trim() || existing?.apiSecret || "";

  await prisma.yolcu360Settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_YOLCU360_SETTINGS,
      apiKey: parsed.data.apiKey,
      apiSecret,
    },
    update: {
      apiKey: parsed.data.apiKey,
      apiSecret,
    },
  });

  clearYolcu360TokenCache();
  revalidateYolcu360Paths();
  return { success: true };
}

export async function testYolcu360SettingsAction(): Promise<Yolcu360SettingsActionState> {
  await requireAdmin();
  try {
    await testYolcu360Connection();
    return { success: true, testOk: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Yolcu360 bağlantı testi başarısız",
    };
  }
}

export async function refreshYolcu360OrderAction(orderId: string) {
  await requireAdmin();
  const apiOrder = await getYolcu360Order(orderId);
  await upsertYolcu360OrderFromApi(apiOrder);
  revalidatePath("/admin/yolcu360/siparisler");
  return { success: true as const };
}

export async function cancelYolcu360OrderAction(orderId: string) {
  await requireAdmin();
  const result = await cancelYolcu360Order(orderId);
  if (result.success) {
    await syncYolcu360OrderStatus(orderId, result.status ?? "cancelled");
  }
  revalidatePath("/admin/yolcu360/siparisler");
  return { success: result.success };
}
