"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BulkWhatsappCampaignStatus,
  BulkWhatsappMessageStatus,
  BulkWhatsappSalutation,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  createBulkWhatsappCampaign,
  processBulkWhatsappCampaignNext,
  setBulkWhatsappCampaignStatus,
} from "@/lib/bulk-whatsapp-service";
import { getBulkWhatsappReportMessages } from "@/lib/queries/bulk-whatsapp";

const BULK_WHATSAPP_PATH = "/admin/acente/toplu-mesaj";

function revalidateBulkWhatsappPaths() {
  revalidatePath(BULK_WHATSAPP_PATH);
}

const templateSchema = z.object({
  title: z.string().trim().min(1, "Başlık gerekli"),
  body: z.string().trim().min(1, "Mesaj gerekli"),
});

export async function createBulkWhatsappTemplateAction(formData: FormData) {
  await requireAdmin();

  const parsed = templateSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  await prisma.bulkWhatsappTemplate.create({ data: parsed.data });
  revalidateBulkWhatsappPaths();
  return { success: true as const };
}

export async function updateBulkWhatsappTemplateAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Şablon bulunamadı" };

  const parsed = templateSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  await prisma.bulkWhatsappTemplate.update({
    where: { id },
    data: parsed.data,
  });
  revalidateBulkWhatsappPaths();
  return { success: true as const };
}

export async function deleteBulkWhatsappTemplateAction(id: string) {
  await requireAdmin();

  try {
    await prisma.bulkWhatsappTemplate.delete({ where: { id } });
    revalidateBulkWhatsappPaths();
    return { success: true as const };
  } catch {
    return { error: "Şablon silinemedi" };
  }
}

const campaignSchema = z.object({
  title: z.string().trim().default(""),
  messageBody: z.string().trim().min(1, "Mesaj şablonu seçin veya yazın"),
  templateId: z.string().optional().default(""),
  salutation: z.enum(["NONE", "SAYIN"]).default("NONE"),
  appendTimestamp: z.coerce.boolean().default(false),
  intervalSeconds: z.coerce.number().int().min(1).max(3600).default(5),
  tagFilterIds: z.array(z.string()).default([]),
  scheduleEnabled: z.coerce.boolean().default(false),
  scheduleFirstDate: z.string().optional().default(""),
  scheduleFirstTime: z.string().regex(/^\d{2}:\d{2}$/).default("10:00"),
  scheduleDays: z.array(z.string()).default([]),
  scheduleStartTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  scheduleEndTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
});

function parseCampaignInput(input: Record<string, unknown>) {
  return campaignSchema.safeParse(input);
}

export async function createBulkWhatsappCampaignAction(input: {
  title: string;
  messageBody: string;
  templateId?: string;
  salutation: BulkWhatsappSalutation;
  appendTimestamp: boolean;
  intervalSeconds: number;
  tagFilterIds: string[];
  scheduleEnabled: boolean;
  scheduleFirstDate?: string;
  scheduleFirstTime: string;
  scheduleDays: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
}) {
  const session = await requireAdmin();
  const parsed = parseCampaignInput(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz kampanya" };
  }

  try {
    const campaign = await createBulkWhatsappCampaign({
      ...parsed.data,
      templateId: parsed.data.templateId || null,
      scheduleFirstDate: parsed.data.scheduleFirstDate
        ? new Date(parsed.data.scheduleFirstDate)
        : null,
      createdBy:
        session.user?.name || session.user?.email || "admin",
    });
    revalidateBulkWhatsappPaths();
    return { success: true as const, campaignId: campaign.id, status: campaign.status };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Kampanya oluşturulamadı",
    };
  }
}

export async function startBulkWhatsappCampaignAction(campaignId: string) {
  await requireAdmin();
  await setBulkWhatsappCampaignStatus(
    campaignId,
    BulkWhatsappCampaignStatus.RUNNING
  );
  revalidateBulkWhatsappPaths();
  return { success: true as const };
}

export async function pauseBulkWhatsappCampaignAction(campaignId: string) {
  await requireAdmin();
  await setBulkWhatsappCampaignStatus(
    campaignId,
    BulkWhatsappCampaignStatus.PAUSED
  );
  revalidateBulkWhatsappPaths();
  return { success: true as const };
}

export async function resumeBulkWhatsappCampaignAction(campaignId: string) {
  await requireAdmin();
  await setBulkWhatsappCampaignStatus(
    campaignId,
    BulkWhatsappCampaignStatus.RUNNING
  );
  revalidateBulkWhatsappPaths();
  return { success: true as const };
}

export async function stopBulkWhatsappCampaignAction(campaignId: string) {
  await requireAdmin();
  await setBulkWhatsappCampaignStatus(
    campaignId,
    BulkWhatsappCampaignStatus.STOPPED
  );
  revalidateBulkWhatsappPaths();
  return { success: true as const };
}

export async function processBulkWhatsappNextAction(campaignId: string) {
  await requireAdmin();
  return processBulkWhatsappCampaignNext(campaignId);
}

export async function getBulkWhatsappReportAction(filters?: {
  status?: BulkWhatsappMessageStatus | "ALL";
  tag?: string;
  campaignId?: string;
}) {
  await requireAdmin();
  return getBulkWhatsappReportMessages(filters);
}

export async function previewBulkWhatsappRecipientCountAction(
  tagFilterIds: string[]
) {
  await requireAdmin();
  const { getBulkWhatsappRecipients } = await import(
    "@/lib/bulk-whatsapp-service"
  );
  const recipients = await getBulkWhatsappRecipients(tagFilterIds);
  return { count: recipients.length };
}
