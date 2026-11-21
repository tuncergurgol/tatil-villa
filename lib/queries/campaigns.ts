import { prisma } from "@/lib/db";
import type { CampaignDisplayType } from "@prisma/client";

export type CampaignAdminItem = Awaited<
  ReturnType<typeof getAllCampaigns>
>[number];

export async function getCampaigns() {
  return prisma.campaign.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllCampaigns() {
  return prisma.campaign.findMany({
    orderBy: [{ displayType: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUnique({ where: { id } });
}

export async function getCampaignAdminData(displayType?: CampaignDisplayType) {
  const [items, totalCount, activeCount, sliderCount, boxCount] =
    await Promise.all([
      prisma.campaign.findMany({
        where: displayType ? { displayType } : undefined,
        orderBy: [{ displayType: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { active: true } }),
      prisma.campaign.count({ where: { displayType: "SLIDER" } }),
      prisma.campaign.count({ where: { displayType: "BOX" } }),
    ]);

  return { items, totalCount, activeCount, sliderCount, boxCount };
}
