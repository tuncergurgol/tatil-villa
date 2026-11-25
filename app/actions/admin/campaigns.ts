"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CampaignDisplayType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

function revalidateCampaignPaths() {
  revalidatePath("/");
  revalidatePath("/admin/kampanyalar");
  revalidatePath("/admin/icerik");
  revalidatePath("/admin/acente/kampanyalar");
}

function parseCampaignForm(formData: FormData) {
  const displayTypeRaw = String(formData.get("displayType") ?? "SLIDER");
  const displayType: CampaignDisplayType =
    displayTypeRaw === "BOX" ? "BOX" : "SLIDER";

  return {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    image: String(formData.get("image") ?? "").trim(),
    cta: String(formData.get("cta") ?? "İncele").trim() || "İncele",
    href: String(formData.get("href") ?? "").trim(),
    displayType,
    sortOrder: parseInt(String(formData.get("sortOrder") || "0"), 10) || 0,
    active:
      formData.get("active") === "on" ||
      formData.get("active") === "true" ||
      formData.get("active") === "1",
  };
}

export async function createCampaign(formData: FormData): Promise<void> {
  await requireAdmin();
  const data = parseCampaignForm(formData);
  if (!data.title || !data.subtitle || !data.image || !data.href) {
    throw new Error("Zorunlu alanları doldurun");
  }

  await prisma.campaign.create({ data });
  revalidateCampaignPaths();
}

export async function createCampaignAndOpen(formData: FormData): Promise<void> {
  await requireAdmin();
  const data = parseCampaignForm(formData);
  if (!data.title || !data.subtitle || !data.image || !data.href) {
    throw new Error("Zorunlu alanları doldurun");
  }

  const campaign = await prisma.campaign.create({ data });
  revalidateCampaignPaths();
  redirect(`/admin/acente/kampanyalar/${campaign.id}`);
}

export async function updateCampaign(
  id: string,
  formData: FormData
): Promise<void> {
  await requireAdmin();
  const data = parseCampaignForm(formData);
  if (!data.title || !data.subtitle || !data.image || !data.href) {
    throw new Error("Zorunlu alanları doldurun");
  }

  await prisma.campaign.update({ where: { id }, data });
  revalidateCampaignPaths();
  revalidatePath(`/admin/acente/kampanyalar/${id}`);
}

export async function deleteCampaign(id: string) {
  await requireAdmin();
  await prisma.campaign.delete({ where: { id } });
  revalidateCampaignPaths();
}

export async function deleteCampaignAndReturn(id: string) {
  await deleteCampaign(id);
  redirect("/admin/acente/kampanyalar");
}

export async function toggleCampaignActive(id: string) {
  await requireAdmin();
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return { error: "Kampanya bulunamadı" };

  await prisma.campaign.update({
    where: { id },
    data: { active: !existing.active },
  });
  revalidateCampaignPaths();
  return { success: true };
}
