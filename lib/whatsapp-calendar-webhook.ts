import { randomUUID } from "crypto";
import { WhatsappCalendarMessageStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import {
  mapIntentToOccupancyMode,
  parseWhatsappCalendarMessage,
} from "@/lib/whatsapp-calendar-parser";
import {
  findVillasByWhatsappGroupId,
  normalizeWhatsappGroupId,
  resolveWhatsappCalendarTargetVillas,
  type WhatsappCalendarLinkedVilla,
} from "@/lib/whatsapp-calendar-villas";

export { normalizeWhatsappGroupId };

export type NormalizedWhatsappCalendarPayload = {
  externalId: string | null;
  groupExternalId: string;
  senderName: string;
  senderPhone: string;
  body: string;
  fromMe: boolean;
};

function readNestedMessageText(message: Record<string, unknown> | undefined) {
  if (!message) return "";
  if (typeof message.conversation === "string") return message.conversation;
  const extended = message.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text) return extended.text;
  const image = message.imageMessage as { caption?: string } | undefined;
  if (image?.caption) return image.caption;
  return "";
}

export function normalizeWhatsappCalendarPayload(
  payload: unknown
): NormalizedWhatsappCalendarPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;

  if (typeof body.groupId === "string" && typeof body.text === "string") {
    return {
      externalId:
        typeof body.messageId === "string" ? body.messageId : randomUUID(),
      groupExternalId: normalizeWhatsappGroupId(body.groupId),
      senderName: typeof body.senderName === "string" ? body.senderName : "",
      senderPhone:
        typeof body.senderPhone === "string" ? body.senderPhone : "",
      body: body.text.trim(),
      fromMe: body.fromMe === true,
    };
  }

  const data = (body.data ?? body.message ?? body) as Record<string, unknown>;
  const key = data.key as Record<string, unknown> | undefined;
  const message = data.message as Record<string, unknown> | undefined;
  const remoteJid =
    (typeof key?.remoteJid === "string" && key.remoteJid) ||
    (typeof data.remoteJid === "string" && data.remoteJid) ||
    "";

  if (!remoteJid.includes("@g.us")) return null;

  const text = readNestedMessageText(message);
  if (!text.trim()) return null;

  return {
    externalId:
      typeof key?.id === "string"
        ? key.id
        : typeof data.id === "string"
          ? data.id
          : randomUUID(),
    groupExternalId: normalizeWhatsappGroupId(remoteJid),
    senderName:
      typeof data.pushName === "string"
        ? data.pushName
        : typeof data.senderName === "string"
          ? data.senderName
          : "",
    senderPhone:
      typeof data.senderPhone === "string"
        ? data.senderPhone
        : typeof key?.participant === "string"
          ? key.participant
          : "",
    body: text.trim(),
    fromMe: key?.fromMe === true || data.fromMe === true,
  };
}

async function logWhatsappCalendarMessage(input: {
  externalId: string | null;
  groupExternalId: string;
  villaId?: string | null;
  senderName: string;
  senderPhone: string;
  body: string;
  intent?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  status: WhatsappCalendarMessageStatus;
  resultMessage: string;
}) {
  if (input.externalId) {
    const duplicate = await prisma.whatsappCalendarMessage.findUnique({
      where: { externalId: input.externalId },
      select: { id: true },
    });
    if (duplicate) {
      return prisma.whatsappCalendarMessage.create({
        data: {
          externalId: `${input.externalId}-${randomUUID()}`,
          groupExternalId: input.groupExternalId,
          villaId: input.villaId ?? null,
          senderName: input.senderName,
          senderPhone: input.senderPhone,
          body: input.body,
          intent: input.intent ?? "",
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          status: WhatsappCalendarMessageStatus.DUPLICATE,
          resultMessage: "Tekrarlanan mesaj",
        },
      });
    }
  }

  return prisma.whatsappCalendarMessage.create({
    data: {
      externalId: input.externalId,
      groupExternalId: input.groupExternalId,
      villaId: input.villaId ?? null,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      body: input.body,
      intent: input.intent ?? "",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: input.status,
      resultMessage: input.resultMessage,
    },
  });
}

export async function processWhatsappCalendarWebhook(
  payload: unknown
): Promise<{ ok: boolean; message: string }> {
  const settings = await getCompanySettings();
  if (!settings.whatsappCalendarEnabled) {
    return { ok: false, message: "WhatsApp takvim otomasyonu kapalı" };
  }

  const normalized = normalizeWhatsappCalendarPayload(payload);
  if (!normalized) {
    return { ok: false, message: "Geçersiz veya grup dışı mesaj" };
  }

  if (normalized.fromMe) {
    return { ok: true, message: "Kendi mesajımız yok sayıldı" };
  }

  if (normalized.externalId) {
    const existing = await prisma.whatsappCalendarMessage.findUnique({
      where: { externalId: normalized.externalId },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, message: "Tekrarlanan mesaj" };
    }
  }

  const groupId = normalized.groupExternalId;
  const linkedVillas = await findVillasByWhatsappGroupId(groupId);
  const targetVillas = resolveWhatsappCalendarTargetVillas(
    linkedVillas,
    normalized.body
  );

  const phraseRules = await prisma.whatsappCalendarPhraseRule.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { phrase: true, intent: true },
  });

  const parsed = parseWhatsappCalendarMessage(normalized.body, phraseRules);

  if (targetVillas.length === 0) {
    await logWhatsappCalendarMessage({
      ...normalized,
      status: WhatsappCalendarMessageStatus.FAILED,
      resultMessage: "Bu grup ile eşleşen villa bulunamadı",
      intent: parsed?.intent ?? "",
      startDate: parsed ? dateKeyToDbDate(parsed.startDateKey) : null,
      endDate: parsed ? dateKeyToDbDate(parsed.endDateKey) : null,
    });
    return { ok: false, message: "Villa eşleşmesi yok" };
  }

  if (!parsed) {
    await logWhatsappCalendarMessage({
      ...normalized,
      villaId: targetVillas[0]?.id,
      status: WhatsappCalendarMessageStatus.IGNORED,
      resultMessage: "Takvim komutu veya tarih algılanamadı",
    });
    return { ok: true, message: "Mesaj yok sayıldı" };
  }

  try {
    const mode = mapIntentToOccupancyMode(parsed.intent);
    const applied = await applyOccupancyToVillas(
      targetVillas,
      parsed.startDateKey,
      parsed.endDateKey,
      mode
    );

    const resultMessage = buildMultiVillaResultMessage(
      applied,
      parsed.summary
    );
    const primaryVillaId = applied[0]?.villa.id ?? targetVillas[0]!.id;

    await prisma.$transaction([
      ...applied.map((item) =>
        prisma.villaIcalSyncEvent.create({
          data: {
            villaId: item.villa.id,
            message: `WhatsApp: ${item.villa.name} için ${parsed.summary} uygulandı (${item.updatedDays} gün güncellendi)`,
          },
        })
      ),
      prisma.whatsappCalendarMessage.create({
        data: {
          externalId: normalized.externalId,
          groupExternalId: groupId,
          villaId: primaryVillaId,
          senderName: normalized.senderName,
          senderPhone: normalized.senderPhone,
          body: normalized.body,
          intent: parsed.intent,
          startDate: dateKeyToDbDate(parsed.startDateKey),
          endDate: dateKeyToDbDate(parsed.endDateKey),
          status: WhatsappCalendarMessageStatus.APPLIED,
          resultMessage,
        },
      }),
    ]);

    return { ok: true, message: resultMessage };
  } catch (error) {
    const resultMessage =
      error instanceof Error ? error.message : "Takvim güncellenemedi";

    await logWhatsappCalendarMessage({
      ...normalized,
      villaId: targetVillas[0]?.id,
      intent: parsed.intent,
      startDate: dateKeyToDbDate(parsed.startDateKey),
      endDate: dateKeyToDbDate(parsed.endDateKey),
      status: WhatsappCalendarMessageStatus.FAILED,
      resultMessage,
    });

    return { ok: false, message: resultMessage };
  }
}

async function applyOccupancyToVillas(
  villas: WhatsappCalendarLinkedVilla[],
  startDateKey: string,
  endDateKey: string,
  mode: "EMPTY" | "BOOKED" | "OPTION"
) {
  const applied: Array<{
    villa: WhatsappCalendarLinkedVilla;
    updatedDays: number;
  }> = [];

  for (const villa of villas) {
    const { updatedDays } = await applyVillaPeriodDaysOccupancy(
      villa.id,
      startDateKey,
      endDateKey,
      mode
    );
    applied.push({ villa, updatedDays });
  }

  return applied;
}

function buildMultiVillaResultMessage(
  applied: Array<{ villa: WhatsappCalendarLinkedVilla; updatedDays: number }>,
  summary: string
) {
  if (applied.length === 1) {
    const only = applied[0]!;
    return `${only.villa.name} için ${summary} uygulandı (${only.updatedDays} gün güncellendi)`;
  }

  const names = applied.map((item) => item.villa.name).join(", ");
  const totalDays = applied.reduce((sum, item) => sum + item.updatedDays, 0);
  return `${names} için ${summary} uygulandı (${applied.length} villa, ${totalDays} gün güncellendi)`;
}

export function verifyWhatsappCalendarWebhookSecret(
  providedSecret: string | null,
  expectedSecret: string
) {
  if (!expectedSecret) return false;
  return providedSecret === expectedSecret;
}
