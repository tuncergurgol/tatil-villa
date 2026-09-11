"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  DEFAULT_COMPANY_SETTINGS,
  getCompanySettings,
} from "@/lib/queries/company-settings";
import { getAssistantWahaConfig } from "@/lib/queries/tatil-assistant";
import {
  getWahaConnectionState,
  logoutWahaSession,
} from "@/lib/waha-client";

export type AssistantWahaActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type AssistantWahaConnectionState = {
  configured: boolean;
  status: string | null;
  pushName: string | null;
  phoneId: string | null;
  qrDataUrl: string | null;
  pairingCode: string | null;
  error: string | null;
};

function revalidateAssistantPage() {
  revalidatePath("/admin/acente/tatil-asistani");
}

export async function saveAssistantWahaConnectionSettings(
  _prev: AssistantWahaActionState,
  formData: FormData
): Promise<AssistantWahaActionState> {
  await requireAdmin();

  const assistantWahaBaseUrl = String(formData.get("assistantWahaBaseUrl") ?? "").trim();
  const assistantWahaApiKey = String(formData.get("assistantWahaApiKey") ?? "").trim();
  const assistantWahaSessionName =
    String(formData.get("assistantWahaSessionName") ?? "tatil-asistani").trim() ||
    "tatil-asistani";

  if (!assistantWahaBaseUrl) {
    return { error: "WAHA API sunucu adresi gerekli" };
  }
  if (!assistantWahaApiKey) {
    return { error: "WAHA API anahtarı gerekli" };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      assistantWahaBaseUrl,
      assistantWahaApiKey,
      assistantWahaSessionName,
    },
    update: {
      assistantWahaBaseUrl,
      assistantWahaApiKey,
      assistantWahaSessionName,
    },
  });

  revalidateAssistantPage();
  return { success: true, message: "Tatil Asistanı WAHA ayarları kaydedildi" };
}

export async function disconnectAssistantWahaAction(): Promise<AssistantWahaConnectionState> {
  await requireAdmin();

  const settings = await getCompanySettings();
  const config = getAssistantWahaConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return {
      configured: false,
      status: null,
      pushName: null,
      phoneId: null,
      qrDataUrl: null,
      pairingCode: null,
      error: null,
    };
  }

  try {
    await logoutWahaSession(config.baseUrl, config.apiKey, config.sessionName);
    const state = await getWahaConnectionState(
      config.baseUrl,
      config.apiKey,
      config.sessionName
    );

    return {
      configured: true,
      status: state?.status ?? "STOPPED",
      pushName: state?.pushName ?? null,
      phoneId: null,
      qrDataUrl: null,
      pairingCode: null,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      status: null,
      pushName: null,
      phoneId: null,
      qrDataUrl: null,
      pairingCode: null,
      error: error instanceof Error ? error.message : "Bağlantı kesilemedi",
    };
  }
}

const settingsSchema = z.object({
  enabled: z.coerce.boolean(),
  welcomeMessage: z.string().max(4000),
  assistantWebhookSecret: z.string().max(200).optional(),
});

export async function saveTatilAssistantSettingsAction(
  _prev: AssistantWahaActionState,
  formData: FormData
): Promise<AssistantWahaActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled"),
    welcomeMessage: formData.get("welcomeMessage"),
    assistantWebhookSecret: formData.get("assistantWebhookSecret"),
  });

  if (!parsed.success) {
    return { error: "Geçersiz ayarlar" };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      tatilAssistantEnabled: parsed.data.enabled,
      assistantWelcomeMessage: parsed.data.welcomeMessage,
      assistantWebhookSecret: parsed.data.assistantWebhookSecret ?? "",
    },
    update: {
      tatilAssistantEnabled: parsed.data.enabled,
      assistantWelcomeMessage: parsed.data.welcomeMessage,
      assistantWebhookSecret: parsed.data.assistantWebhookSecret ?? "",
    },
  });

  revalidateAssistantPage();
  return { success: true, message: "Tatil Asistanı ayarları kaydedildi" };
}

const topicSchema = z.object({
  title: z.string().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.coerce.boolean(),
});

export async function saveTatilAssistantTopicAction(
  id: number | null,
  formData: FormData
) {
  await requireAdmin();
  const parsed = topicSchema.safeParse({
    title: formData.get("title"),
    sortOrder: formData.get("sortOrder"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Geçersiz konu" };

  if (id) {
    await prisma.tatilAssistantTopic.update({
      where: { id },
      data: parsed.data,
    });
  } else {
    await prisma.tatilAssistantTopic.create({ data: parsed.data });
  }

  revalidateAssistantPage();
  return { success: true };
}

export async function deleteTatilAssistantTopicAction(id: number) {
  await requireAdmin();
  await prisma.tatilAssistantTopic.delete({ where: { id } });
  revalidateAssistantPage();
  return { success: true };
}

const exampleSchema = z.object({
  topicId: z.coerce.number().int(),
  question: z.string().min(1),
  answer: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.coerce.boolean(),
});

export async function saveTatilAssistantExampleAction(
  id: number | null,
  formData: FormData
) {
  await requireAdmin();
  const parsed = exampleSchema.safeParse({
    topicId: formData.get("topicId"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    sortOrder: formData.get("sortOrder"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Geçersiz örnek" };

  if (id) {
    await prisma.tatilAssistantExample.update({
      where: { id },
      data: parsed.data,
    });
  } else {
    await prisma.tatilAssistantExample.create({ data: parsed.data });
  }

  revalidateAssistantPage();
  return { success: true };
}

export async function deleteTatilAssistantExampleAction(id: number) {
  await requireAdmin();
  await prisma.tatilAssistantExample.delete({ where: { id } });
  revalidateAssistantPage();
  return { success: true };
}

const ruleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.coerce.boolean(),
});

export async function saveTatilAssistantRuleAction(
  id: number | null,
  formData: FormData
) {
  await requireAdmin();
  const parsed = ruleSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    sortOrder: formData.get("sortOrder"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Geçersiz kural" };

  if (id) {
    await prisma.tatilAssistantRule.update({
      where: { id },
      data: parsed.data,
    });
  } else {
    await prisma.tatilAssistantRule.create({ data: parsed.data });
  }

  revalidateAssistantPage();
  return { success: true };
}

export async function deleteTatilAssistantRuleAction(id: number) {
  await requireAdmin();
  await prisma.tatilAssistantRule.delete({ where: { id } });
  revalidateAssistantPage();
  return { success: true };
}
