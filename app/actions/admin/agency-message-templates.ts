"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { isValidAgencyMessageRecipient } from "@/lib/agency-message-recipients";

export type AgencyMessageTemplateActionState = {
  success?: boolean;
  error?: string;
};

const itemSchema = z.object({
  rowNo: z.coerce.number().int().min(1, "Sıra no gerekli"),
  name: z.string().min(1, "Mesaj adı gerekli"),
  recipient: z
    .string()
    .min(1, "Alıcı seçiniz")
    .refine(isValidAgencyMessageRecipient, "Geçersiz alıcı"),
  smsBody: z.string().optional().default(""),
  whatsappBody: z.string().optional().default(""),
  mailBody: z.string().optional().default(""),
  scheduleTiming: z.string().optional().default(""),
  scheduleEnabled: z.boolean().optional().default(false),
  scheduleAnchor: z.enum(["", "check_in", "check_out"]).optional().default(""),
  scheduleOffsetDays: z.coerce.number().int().optional().default(0),
  scheduleHour: z.coerce.number().int().min(0).max(23).optional().default(10),
  scheduleMinute: z.coerce.number().int().min(0).max(59).optional().default(0),
});

function revalidatePaths() {
  revalidatePath("/admin/acente/mesaj-icerigi");
}

function parseFormData(formData: FormData) {
  return itemSchema.safeParse({
    rowNo: formData.get("rowNo"),
    name: formData.get("name"),
    recipient: formData.get("recipient"),
    smsBody: formData.get("smsBody"),
    whatsappBody: formData.get("whatsappBody"),
    mailBody: formData.get("mailBody"),
    scheduleTiming: formData.get("scheduleTiming") ?? "",
    scheduleEnabled: formData.get("scheduleEnabled") === "on",
    scheduleAnchor: formData.get("scheduleAnchor") ?? "",
    scheduleOffsetDays: formData.get("scheduleOffsetDays") ?? 0,
    scheduleHour: formData.get("scheduleHour") ?? 10,
    scheduleMinute: formData.get("scheduleMinute") ?? 0,
  });
}

export async function createAgencyMessageTemplate(
  _prev: AgencyMessageTemplateActionState,
  formData: FormData
): Promise<AgencyMessageTemplateActionState> {
  await requireAdmin();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const maxSort = await prisma.agencyMessageTemplate.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.agencyMessageTemplate.create({
      data: {
        rowNo: parsed.data.rowNo,
        name: parsed.data.name.trim(),
        recipient: parsed.data.recipient,
        smsBody: parsed.data.smsBody ?? "",
        whatsappBody: parsed.data.whatsappBody ?? "",
        mailBody: parsed.data.mailBody ?? "",
        scheduleTiming: parsed.data.scheduleTiming ?? "",
        scheduleEnabled: parsed.data.scheduleEnabled ?? false,
        scheduleAnchor: parsed.data.scheduleAnchor ?? "",
        scheduleOffsetDays: parsed.data.scheduleOffsetDays ?? 0,
        scheduleHour: parsed.data.scheduleHour ?? 10,
        scheduleMinute: parsed.data.scheduleMinute ?? 0,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt oluşturulamadı" };
  }
}

export async function updateAgencyMessageTemplate(
  _prev: AgencyMessageTemplateActionState,
  formData: FormData
): Promise<AgencyMessageTemplateActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = parseFormData(formData);
  if (!id || !parsed.success) {
    return {
      error: parsed.success
        ? "Geçersiz form verisi"
        : (parsed.error.issues[0]?.message ?? "Geçersiz form verisi"),
    };
  }

  try {
    await prisma.agencyMessageTemplate.update({
      where: { id },
      data: {
        rowNo: parsed.data.rowNo,
        name: parsed.data.name.trim(),
        recipient: parsed.data.recipient,
        smsBody: parsed.data.smsBody ?? "",
        whatsappBody: parsed.data.whatsappBody ?? "",
        mailBody: parsed.data.mailBody ?? "",
        scheduleTiming: parsed.data.scheduleTiming ?? "",
        scheduleEnabled: parsed.data.scheduleEnabled ?? false,
        scheduleAnchor: parsed.data.scheduleAnchor ?? "",
        scheduleOffsetDays: parsed.data.scheduleOffsetDays ?? 0,
        scheduleHour: parsed.data.scheduleHour ?? 10,
        scheduleMinute: parsed.data.scheduleMinute ?? 0,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }
}

export async function deleteAgencyMessageTemplate(
  id: string
): Promise<AgencyMessageTemplateActionState> {
  await requireAdmin();

  try {
    await prisma.agencyMessageTemplate.update({
      where: { id },
      data: { active: false },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt silinemedi" };
  }
}
