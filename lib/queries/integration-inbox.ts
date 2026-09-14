import { prisma } from "@/lib/db";

export async function listNewBiletallInquiriesForInbox(limit = 12) {
  return prisma.biletallInquiry.findMany({
    where: { adminSeenAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listBiletallInquiries(limit = 100) {
  return prisma.biletallInquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countNewIntegrationLeads() {
  const [yolcu360, obilet] = await Promise.all([
    prisma.yolcu360Order.count({ where: { adminSeenAt: null } }),
    prisma.biletallInquiry.count({ where: { adminSeenAt: null } }),
  ]);
  return { yolcu360, obilet, total: yolcu360 + obilet };
}
