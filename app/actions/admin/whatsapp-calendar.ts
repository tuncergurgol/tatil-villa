"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WhatsappCalendarMessageStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  mapIntentToOccupancyMode,
  parseWhatsappCalendarMessage,
} from "@/lib/whatsapp-calendar-parser";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import { normalizeWhatsappGroupId } from "@/lib/whatsapp-calendar-webhook";
import {
  findVillasByWhatsappGroupId,
  resolveWhatsappCalendarTargetVillas,
} from "@/lib/whatsapp-calendar-villas";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  fetchEvolutionWhatsappGroups,
  getEvolutionConnectionState,
  setEvolutionWebhook,
  type EvolutionWhatsappGroup,
} from "@/lib/evolution-client";
import { resolveSiteOrigin } from "@/lib/villa-ical-url";

export type WhatsappCalendarActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type ListEvolutionGroupsResult = {
  success?: boolean;
  error?: string;
  groups?: EvolutionWhatsappGroup[];
};

function revalidateWhatsappCalendarPaths() {
  revalidatePath("/admin/acente/evolution-whatsapp");
  revalidatePath("/admin/villalar");
}

const groupSchema = z.object({
  name: z.string().min(1, "Grup adı gerekli"),
  externalId: z.string().min(3, "Grup ID gerekli"),
  villaId: z.string().min(1, "Villa seçimi gerekli"),
});

export async function saveWhatsappCalendarSettings(
  _prev: WhatsappCalendarActionState,
  formData: FormData
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const enabled = formData.get("whatsappCalendarEnabled") === "on";
  const webhookSecret = String(formData.get("whatsappCalendarWebhookSecret") ?? "").trim();

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      whatsappCalendarEnabled: enabled,
      whatsappCalendarWebhookSecret: webhookSecret,
    },
    update: {
      whatsappCalendarEnabled: enabled,
      whatsappCalendarWebhookSecret: webhookSecret,
    },
  });

  const settings = await getCompanySettings();
  const baseUrl =
    settings.evolutionBaseUrl?.trim() ||
    process.env.EVOLUTION_BASE_URL?.trim() ||
    "";
  const apiKey =
    settings.evolutionApiKey?.trim() ||
    process.env.EVOLUTION_API_KEY?.trim() ||
    "";
  const instanceName =
    settings.evolutionInstanceName?.trim() ||
    process.env.EVOLUTION_INSTANCE_NAME?.trim() ||
    "tatil-villa";

  let webhookNote = "";
  if (enabled && baseUrl && apiKey && webhookSecret) {
    const siteOrigin = resolveSiteOrigin({
      companyDomain: settings.domain,
    });
    const webhookUrl = `${siteOrigin}/api/webhooks/whatsapp-calendar`;
    try {
      await setEvolutionWebhook(
        baseUrl,
        apiKey,
        instanceName,
        webhookUrl,
        webhookSecret
      );
      webhookNote = " Webhook Evolution'a kaydedildi.";
    } catch (error) {
      webhookNote = ` UYARI: Webhook kurulamadı (${
        error instanceof Error ? error.message : "bilinmeyen hata"
      }). WhatsApp bağlantısını tamamlayıp tekrar kaydedin.`;
    }
  }

  revalidateWhatsappCalendarPaths();
  return { success: true, message: `Ayarlar kaydedildi.${webhookNote}` };
}

export async function generateWhatsappCalendarWebhookSecretAction(): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const secret = randomBytes(24).toString("hex");
  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      whatsappCalendarWebhookSecret: secret,
    },
    update: {
      whatsappCalendarWebhookSecret: secret,
    },
  });

  revalidateWhatsappCalendarPaths();
  return { success: true, message: secret };
}

export async function listEvolutionWhatsappGroupsAction(): Promise<ListEvolutionGroupsResult> {
  await requireAdmin();

  const settings = await getCompanySettings();
  const baseUrl =
    settings.evolutionBaseUrl?.trim() ||
    process.env.EVOLUTION_BASE_URL?.trim() ||
    "http://localhost:8080";
  const apiKey =
    settings.evolutionApiKey?.trim() ||
    process.env.EVOLUTION_API_KEY?.trim() ||
    "";
  const instanceName =
    settings.evolutionInstanceName?.trim() ||
    process.env.EVOLUTION_INSTANCE_NAME?.trim() ||
    "tatil-villa";

  if (!apiKey) {
    return {
      error:
        "Önce Evolution API anahtarını kaydedin ve WhatsApp bağlantısını tamamlayın",
    };
  }

  try {
    const connection = await getEvolutionConnectionState(
      baseUrl,
      apiKey,
      instanceName
    );
    if (connection?.status !== "WORKING") {
      return { success: true, groups: [] };
    }

    const groups = await fetchEvolutionWhatsappGroups(
      baseUrl,
      apiKey,
      instanceName
    );
    return { success: true, groups };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "WhatsApp grupları yüklenemedi. Bağlantı durumunu kontrol edin.",
    };
  }
}

export async function createWhatsappCalendarGroup(
  _prev: WhatsappCalendarActionState,
  formData: FormData
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    externalId: formData.get("externalId"),
    villaId: formData.get("villaId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const externalId = normalizeWhatsappGroupId(parsed.data.externalId);
  const groupName = parsed.data.name.trim();
  const villaId = parsed.data.villaId.trim();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, name: true, villaId: true },
  });
  if (!villa) {
    return { error: "Seçilen villa bulunamadı" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.whatsappCalendarGroup.upsert({
        where: { externalId },
        create: {
          externalId,
          name: groupName,
          active: true,
        },
        update: {
          name: groupName,
          active: true,
        },
      });

      await tx.villa.update({
        where: { id: villa.id },
        data: {
          whatsappGroupId: externalId,
        },
      });
    });

    revalidateWhatsappCalendarPaths();
    return {
      success: true,
      message: `${groupName} grubu #${villa.villaId ?? "-"} ${villa.name} villasına eşlendi`,
    };
  } catch {
    return { error: "Grup-villa eşleşmesi kaydedilemedi" };
  }
}

export async function deleteWhatsappCalendarGroup(
  id: string
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  try {
    await prisma.whatsappCalendarGroup.delete({ where: { id } });
    revalidateWhatsappCalendarPaths();
    return { success: true };
  } catch {
    return { error: "Grup silinemedi" };
  }
}

export async function testWhatsappCalendarParserAction(
  sampleText: string
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const phraseRules = await prisma.whatsappCalendarPhraseRule.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { phrase: true, intent: true },
  });

  const parsed = parseWhatsappCalendarMessage(sampleText, phraseRules);
  if (!parsed) {
    return { error: "Mesajdan takvim komutu çıkarılamadı" };
  }

  const phraseNote = parsed.matchedPhrase
    ? ` · eşleşen ifade: "${parsed.matchedPhrase}"`
    : "";

  return {
    success: true,
    message: `${parsed.summary} (${mapIntentToOccupancyMode(parsed.intent)})${phraseNote}`,
  };
}

export async function applyWhatsappCalendarParserTestAction(
  villaId: string,
  sampleText: string
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const phraseRules = await prisma.whatsappCalendarPhraseRule.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { phrase: true, intent: true },
  });

  const parsed = parseWhatsappCalendarMessage(sampleText, phraseRules);
  if (!parsed) {
    return { error: "Mesajdan takvim komutu çıkarılamadı" };
  }

  const mode = mapIntentToOccupancyMode(parsed.intent);
  const result = await applyVillaPeriodDaysOccupancy(
    villaId,
    parsed.startDateKey,
    parsed.endDateKey,
    mode
  );

  revalidateWhatsappCalendarPaths();
  return {
    success: true,
    message: `${parsed.summary} uygulandı (${result.updatedDays} gün güncellendi)`,
  };
}

const phraseRuleSchema = z.object({
  phrase: z.string().min(1, "Mesaj örneği / ifade gerekli").max(120),
  intent: z.enum(["CLOSE", "OPEN", "OPTION"]),
});

export async function createWhatsappCalendarPhraseRule(
  _prev: WhatsappCalendarActionState,
  formData: FormData
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const parsed = phraseRuleSchema.safeParse({
    phrase: String(formData.get("phrase") ?? "").trim(),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const maxSort = await prisma.whatsappCalendarPhraseRule.aggregate({
    _max: { sortOrder: true },
  });

  try {
    await prisma.whatsappCalendarPhraseRule.create({
      data: {
        phrase: parsed.data.phrase,
        intent: parsed.data.intent,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      },
    });
    revalidateWhatsappCalendarPaths();
    return { success: true, message: "Mesaj örneği eklendi" };
  } catch {
    return { error: "Bu ifade aynı işlem için zaten kayıtlı" };
  }
}

export async function deleteWhatsappCalendarPhraseRule(
  id: string
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  try {
    await prisma.whatsappCalendarPhraseRule.delete({ where: { id } });
    revalidateWhatsappCalendarPaths();
    return { success: true, message: "Mesaj örneği silindi" };
  } catch {
    return { error: "Mesaj örneği silinemedi" };
  }
}

export async function toggleWhatsappCalendarPhraseRule(
  id: string,
  active: boolean
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  try {
    await prisma.whatsappCalendarPhraseRule.update({
      where: { id },
      data: { active },
    });
    revalidateWhatsappCalendarPaths();
    return {
      success: true,
      message: active ? "Örnek etkinleştirildi" : "Örnek pasifleştirildi",
    };
  } catch {
    return { error: "Durum güncellenemedi" };
  }
}

export async function retryWhatsappCalendarMessageAction(
  messageId: string
): Promise<WhatsappCalendarActionState> {
  await requireAdmin();

  const message = await prisma.whatsappCalendarMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      body: true,
      groupExternalId: true,
      villaId: true,
      status: true,
    },
  });

  if (!message) {
    return { error: "Mesaj kaydı bulunamadı" };
  }

  if (message.status !== WhatsappCalendarMessageStatus.FAILED) {
    return { error: "ÇİLEK yalnızca Hata durumundaki mesajlar için kullanılır" };
  }

  const groupId = normalizeWhatsappGroupId(message.groupExternalId);
  const linkedVillas = await findVillasByWhatsappGroupId(groupId);

  const phraseRules = await prisma.whatsappCalendarPhraseRule.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { phrase: true, intent: true },
  });

  // Tarih yoksa aynı gruptaki önceki mesajdan tarih bağlamı al.
  const recentContext = await prisma.whatsappCalendarMessage.findFirst({
    where: {
      groupExternalId: groupId,
      id: { not: message.id },
      body: { not: "" },
    },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });

  const parsed = parseWhatsappCalendarMessage(
    message.body,
    phraseRules,
    recentContext?.body
  );

  const targetVillas = resolveWhatsappCalendarTargetVillas(
    linkedVillas,
    [message.body, recentContext?.body ?? ""].filter(Boolean).join(" ")
  );

  if (targetVillas.length === 0) {
    await prisma.whatsappCalendarMessage.update({
      where: { id: message.id },
      data: {
        status: WhatsappCalendarMessageStatus.FAILED,
        resultMessage: "Bu grup ile eşleşen villa bulunamadı",
        intent: parsed?.intent ?? "",
        startDate: parsed ? dateKeyToDbDate(parsed.startDateKey) : null,
        endDate: parsed ? dateKeyToDbDate(parsed.endDateKey) : null,
      },
    });
    revalidateWhatsappCalendarPaths();
    return { error: "Hata" };
  }

  if (!parsed) {
    await prisma.whatsappCalendarMessage.update({
      where: { id: message.id },
      data: {
        villaId: targetVillas[0]?.id,
        status: WhatsappCalendarMessageStatus.FAILED,
        resultMessage: "Mesaj örneklerinden komut algılanamadı",
        intent: "",
        startDate: null,
        endDate: null,
      },
    });
    revalidateWhatsappCalendarPaths();
    return { error: "Hata" };
  }

  try {
    const mode = mapIntentToOccupancyMode(parsed.intent);
    const applied: Array<{ name: string; updatedDays: number }> = [];

    for (const villa of targetVillas) {
      const { updatedDays } = await applyVillaPeriodDaysOccupancy(
        villa.id,
        parsed.startDateKey,
        parsed.endDateKey,
        mode
      );
      applied.push({ name: villa.name, updatedDays });
    }

    const totalUpdatedDays = applied.reduce(
      (sum, item) => sum + item.updatedDays,
      0
    );

    // Takvimde hiçbir gün değişmediyse "Uygulandı" sayma → HATA.
    if (totalUpdatedDays === 0) {
      const names = applied.map((item) => item.name).join(", ") || "Villa";
      await prisma.whatsappCalendarMessage.update({
        where: { id: message.id },
        data: {
          villaId: targetVillas[0]!.id,
          intent: parsed.intent,
          startDate: dateKeyToDbDate(parsed.startDateKey),
          endDate: dateKeyToDbDate(parsed.endDateKey),
          status: WhatsappCalendarMessageStatus.FAILED,
          resultMessage: `${names} için ${parsed.summary} uygulanamadı: takvimde güncellenecek gün bulunamadı (0 gün).`,
        },
      });
      revalidateWhatsappCalendarPaths();
      return { error: "Hata" };
    }

    const resultMessage =
      applied.length === 1
        ? `${applied[0]!.name} için ${parsed.summary} uygulandı (${applied[0]!.updatedDays} gün güncellendi)`
        : `${applied.map((item) => item.name).join(", ")} için ${parsed.summary} uygulandı (${applied.length} villa, ${totalUpdatedDays} gün güncellendi)`;

    await prisma.$transaction([
      ...targetVillas
        .map((villa, index) => ({ villa, updatedDays: applied[index]?.updatedDays ?? 0 }))
        .filter((item) => item.updatedDays > 0)
        .map((item) =>
          prisma.villaIcalSyncEvent.create({
            data: {
              villaId: item.villa.id,
              message: `WhatsApp ÇİLEK: ${item.villa.name} için ${parsed.summary} uygulandı (${item.updatedDays} gün güncellendi)`,
            },
          })
        ),
      prisma.whatsappCalendarMessage.update({
        where: { id: message.id },
        data: {
          villaId: targetVillas[0]!.id,
          intent: parsed.intent,
          startDate: dateKeyToDbDate(parsed.startDateKey),
          endDate: dateKeyToDbDate(parsed.endDateKey),
          status: WhatsappCalendarMessageStatus.APPLIED,
          resultMessage,
        },
      }),
    ]);

    revalidateWhatsappCalendarPaths();
    return { success: true, message: "Uygulandı" };
  } catch (error) {
    const resultMessage =
      error instanceof Error ? error.message : "Takvim güncellenemedi";

    await prisma.whatsappCalendarMessage.update({
      where: { id: message.id },
      data: {
        villaId: targetVillas[0]?.id,
        intent: parsed.intent,
        startDate: dateKeyToDbDate(parsed.startDateKey),
        endDate: dateKeyToDbDate(parsed.endDateKey),
        status: WhatsappCalendarMessageStatus.FAILED,
        resultMessage,
      },
    });

    revalidateWhatsappCalendarPaths();
    return { error: "Hata" };
  }
}
