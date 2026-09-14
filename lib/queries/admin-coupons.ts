import { prisma } from "@/lib/db";

export async function getAdminCouponListData() {
  return prisma.coupon.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
}

export type AdminCouponListItem = Awaited<
  ReturnType<typeof getAdminCouponListData>
>[number];
