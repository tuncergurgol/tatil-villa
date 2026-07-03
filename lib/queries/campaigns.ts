import { prisma } from "@/lib/db";

export async function getCampaigns() {
  return prisma.campaign.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllCampaigns() {
  return prisma.campaign.findMany({ orderBy: { sortOrder: "asc" } });
}
