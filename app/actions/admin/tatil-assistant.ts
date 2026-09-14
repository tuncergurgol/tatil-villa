"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  DEFAULT_COMPANY_SETTINGS,
  getCompanySettings,
} from "@/lib/queries/company-settings";
import { randomUUID } from "crypto";
import {
  getAssistantWahaConfig,
  getNotificationWahaConfig,
} from "@/lib/queries/tatil-assistant";
import {
  extractWahaQaPairs,
  mergeExtractedWahaQaPairs,
  WAHA_QA_TOPIC_TITLE,
} from "@/lib/tatil-assistant-waha-qa";
import {
  getWahaConnectionState,
  isIndividualWahaChat,
  listWahaChatMessages,
  listWahaChats,
  logoutWahaSession,
  serializeWahaChatId,
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

type WahaQaSyncJob = {
  pairs: ReturnType<typeof extractWahaQaPairs>;
  total: number;
  processed: number;
};

const wahaQaSyncJobs = new Map<string, WahaQaSyncJob>();

export type WahaQaSyncChat = {
  id: string;
  name: string;
};

export type WahaQaSyncStartResult =
  | {
      error: string;
      success?: false;
      syncId?: undefined;
      chats?: undefined;
      total?: undefined;
    }
  | {
      success: true;
      error?: undefined;
      syncId: string;
      chats: WahaQaSyncChat[];
      total: number;
    };

export async function startTatilAssistantWahaQaSyncAction(): Promise<WahaQaSyncStartResult> {
  await requireAdmin();
  const settings = await getCompanySettings();
  const config = getNotificationWahaConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return { error: "Bildirim WhatsApp (WAHA) ayarları eksik" };
  }

  try {
    const chats = await listWahaChats(
      config.baseUrl,
      config.apiKey,
      config.sessionName
    );
    const individuals = chats
      .filter(isIndividualWahaChat)
      .map((chat) => ({
        id: serializeWahaChatId(chat.id),
        name: (chat.name ?? "").trim() || serializeWahaChatId(chat.id),
      }))
      .filter((chat) => chat.id);

    const syncId = randomUUID();
    wahaQaSyncJobs.set(syncId, {
      pairs: [],
      total: individuals.length,
      processed: 0,
    });

    return {
      success: true,
      syncId,
      chats: individuals,
      total: individuals.length,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "WAHA sohbetleri alınamadı",
    };
  }
}

export async function syncTatilAssistantWahaQaBatchAction(input: {
  syncId: string;
  chats: WahaQaSyncChat[];
}): Promise<
  | { error: string; success?: false }
  | {
      success: true;
      processed: number;
      total: number;
      done: boolean;
      uniqueCount: number;
    }
> {
  await requireAdmin();
  const job = wahaQaSyncJobs.get(input.syncId);
  if (!job) {
    return { error: "Tarama oturumu bulunamadı. Yeniden başlatın." };
  }

  const settings = await getCompanySettings();
  const config = getNotificationWahaConfig(settings);
  if (!config.baseUrl || !config.apiKey) {
    return { error: "Bildirim WhatsApp (WAHA) ayarları eksik" };
  }

  for (const chat of input.chats) {
    try {
      const messages = await listWahaChatMessages(
        config.baseUrl,
        config.apiKey,
        config.sessionName,
        chat.id,
        { pageSize: 100, maxMessages: 400 }
      );
      job.pairs.push(...extractWahaQaPairs(messages, chat.name));
    } catch {
      // tek sohbet hatası taramayı durdurmasın
    }
    job.processed += 1;
  }

  const done = job.processed >= job.total;
  let uniqueCount = 0;

  if (done) {
    const merged = mergeExtractedWahaQaPairs(job.pairs);
    uniqueCount = merged.length;

    for (const pair of merged) {
      const lastSeenAt = pair.timestamp
        ? new Date(pair.timestamp * 1000)
        : new Date();
      await prisma.tatilAssistantWahaQa.upsert({
        where: { fingerprint: pair.fingerprint },
        create: {
          fingerprint: pair.fingerprint,
          question: pair.question,
          answer: pair.answer,
          occurrenceCount: pair.occurrenceCount,
          sampleChatName: pair.chatName,
          lastSeenAt,
        },
        update: {
          question: pair.question,
          answer: pair.answer,
          occurrenceCount: pair.occurrenceCount,
          sampleChatName: pair.chatName,
          lastSeenAt,
        },
      });
    }

    wahaQaSyncJobs.delete(input.syncId);
    revalidateAssistantPage();
  }

  return {
    success: true,
    processed: job.processed,
    total: job.total,
    done,
    uniqueCount,
  };
}

export async function toggleTatilAssistantWahaQaImportAction(
  id: string,
  imported: boolean
) {
  await requireAdmin();

  const item = await prisma.tatilAssistantWahaQa.findUnique({ where: { id } });
  if (!item) return { error: "Kayıt bulunamadı" };

  if (!imported) {
    if (item.importedExampleId) {
      await prisma.tatilAssistantExample
        .delete({
          where: { id: item.importedExampleId },
        })
        .catch(() => undefined);
      await prisma.tatilAssistantWahaQa.update({
        where: { id },
        data: { importedExampleId: null },
      });
    }
    revalidateAssistantPage();
    return { success: true };
  }

  if (item.importedExampleId) {
    return { success: true };
  }

  let topic = await prisma.tatilAssistantTopic.findFirst({
    where: { title: WAHA_QA_TOPIC_TITLE },
  });
  if (!topic) {
    topic = await prisma.tatilAssistantTopic.create({
      data: {
        title: WAHA_QA_TOPIC_TITLE,
        sortOrder: 50,
        active: true,
      },
    });
  }

  const example = await prisma.tatilAssistantExample.create({
    data: {
      topicId: topic.id,
      question: item.question,
      answer: item.answer,
      sortOrder: 99,
      active: true,
    },
  });

  await prisma.tatilAssistantWahaQa.update({
    where: { id },
    data: { importedExampleId: example.id },
  });

  revalidateAssistantPage();
  return { success: true };
}
