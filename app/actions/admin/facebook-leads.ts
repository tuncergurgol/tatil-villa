"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { FacebookLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { notifyFacebookLead } from "@/lib/facebook-lead-notify";
import { updateCompanySettings } from "@/lib/queries/company-settings";

const STATUSES: FacebookLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
  "SPAM",
];

function revalidateFacebookLeadPaths() {
  revalidatePath("/admin/pazarlama/facebook-lead");
}

export async function updateFacebookLeadSettingsAction(formData: FormData) {
  await requireAdmin();

  const currentToken = String(formData.get("facebookLeadVerifyToken") ?? "").trim();
  const verifyToken =
    currentToken ||
    randomBytes(16).toString("hex");

  await updateCompanySettings({
    facebookLeadEnabled: formData.get("facebookLeadEnabled") === "on",
    facebookLeadAppId: String(formData.get("facebookLeadAppId") ?? "").trim(),
    facebookLeadAppSecret: String(
      formData.get("facebookLeadAppSecret") ?? ""
    ).trim(),
    facebookLeadVerifyToken: verifyToken,
    facebookLeadPageId: String(formData.get("facebookLeadPageId") ?? "").trim(),
    facebookLeadPageAccessToken: String(
      formData.get("facebookLeadPageAccessToken") ?? ""
    ).trim(),
  });

  revalidateFacebookLeadPaths();
  return { ok: true as const };
}

export async function markFacebookLeadSeenAction(id: string) {
  await requireAdmin();
  await prisma.facebookLead.update({
    where: { id },
    data: { adminSeenAt: new Date() },
  });
  revalidateFacebookLeadPaths();
}

export async function updateFacebookLeadStatusAction(
  id: string,
  status: FacebookLeadStatus
) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return { ok: false as const };

  await prisma.facebookLead.update({
    where: { id },
    data: {
      status,
      adminSeenAt: new Date(),
    },
  });
  revalidateFacebookLeadPaths();
  return { ok: true as const };
}

export async function updateFacebookLeadNoteAction(id: string, note: string) {
  await requireAdmin();
  await prisma.facebookLead.update({
    where: { id },
    data: { adminNote: note.trim() },
  });
  revalidateFacebookLeadPaths();
  return { ok: true as const };
}

export async function scheduleFacebookLeadFollowUpAction(
  id: string,
  isoDate: string
) {
  await requireAdmin();
  const nextFollowUpAt = isoDate ? new Date(isoDate) : null;
  await prisma.facebookLead.update({
    where: { id },
    data: { nextFollowUpAt },
  });
  revalidateFacebookLeadPaths();
  return { ok: true as const };
}

export async function logFacebookLeadContactAction(input: {
  leadId: string;
  channel: string;
  message: string;
  contactedBy?: string;
  markContacted?: boolean;
}) {
  const session = await requireAdmin();
  const channel = input.channel.trim();
  const message = input.message.trim();
  if (!channel || !message) return { ok: false as const };

  await prisma.$transaction(async (tx) => {
    await tx.facebookLeadContactLog.create({
      data: {
        leadId: input.leadId,
        channel,
        message,
        createdBy:
          input.contactedBy?.trim() ||
          session.user?.name ||
          session.user?.email ||
          "",
      },
    });

    await tx.facebookLead.update({
      where: { id: input.leadId },
      data: {
        contactAttempts: { increment: 1 },
        lastContactAt: new Date(),
        contactedBy:
          input.contactedBy?.trim() ||
          session.user?.name ||
          session.user?.email ||
          "",
        adminSeenAt: new Date(),
        ...(input.markContacted ? { status: "CONTACTED" as const } : {}),
      },
    });
  });

  revalidateFacebookLeadPaths();
  return { ok: true as const };
}

export async function createManualFacebookLeadAction(formData: FormData) {
  await requireAdmin();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!fullName && !phone && !email) {
    return { ok: false as const, message: "Ad, telefon veya e-posta gerekli" };
  }

  const externalLeadId = `manual_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const lead = await prisma.facebookLead.create({
    data: {
      externalLeadId,
      fullName,
      phone,
      email,
      adminNote: note,
      formName: "Manuel giriş",
      isTest: false,
    },
  });

  revalidateFacebookLeadPaths();
  return { ok: true as const, id: lead.id };
}

export async function createTestFacebookLeadAction() {
  await requireAdmin();

  const externalLeadId = `test_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const lead = await prisma.facebookLead.create({
    data: {
      externalLeadId,
      fullName: "Test Lead — Ayşe Yılmaz",
      phone: "+905551112233",
      email: "test.lead@example.com",
      formName: "Villa Tatil Formu (Test)",
      campaignName: "Yaz 2026 Villa Kampanyası",
      adName: "Özel Havuzlu Villa Reklamı",
      customFieldsJson: {
        tatil_tarihi: "15-22 Ağustos 2026",
        kisi_sayisi: "4",
        bolge: "Fethiye / Ölüdeniz",
      },
      isTest: true,
    },
  });

  revalidateFacebookLeadPaths();
  return { ok: true as const, id: lead.id };
}

export async function deleteFacebookLeadAction(id: string) {
  await requireAdmin();
  await prisma.facebookLead.delete({ where: { id } });
  revalidateFacebookLeadPaths();
  return { ok: true as const };
}
