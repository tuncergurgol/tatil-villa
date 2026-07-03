"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export async function createCampaign(formData: FormData) {
  await requireAdmin();
  await prisma.campaign.create({
    data: {
      title: formData.get("title") as string,
      subtitle: formData.get("subtitle") as string,
      image: formData.get("image") as string,
      cta: formData.get("cta") as string,
      href: formData.get("href") as string,
      sortOrder: parseInt((formData.get("sortOrder") as string) || "0", 10),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/");
  revalidatePath("/admin/kampanyalar");
}

export async function updateCampaign(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.campaign.update({
    where: { id },
    data: {
      title: formData.get("title") as string,
      subtitle: formData.get("subtitle") as string,
      image: formData.get("image") as string,
      cta: formData.get("cta") as string,
      href: formData.get("href") as string,
      sortOrder: parseInt((formData.get("sortOrder") as string) || "0", 10),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/");
  revalidatePath("/admin/kampanyalar");
}

export async function deleteCampaign(id: string) {
  await requireAdmin();
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/admin/kampanyalar");
  revalidatePath("/");
}
