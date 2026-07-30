"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

function revalidateInboxPaths() {
  revalidatePath("/admin/acente/sizi-arayalim");
  revalidatePath("/admin/yolcu360/siparisler");
}

export async function markYolcu360OrderSeenAction(orderId: string) {
  await requireAdmin();
  await prisma.yolcu360Order.updateMany({
    where: { id: orderId },
    data: { adminSeenAt: new Date() },
  });
  revalidateInboxPaths();
}

export async function markBiletallInquirySeenAction(inquiryId: string) {
  await requireAdmin();
  await prisma.biletallInquiry.updateMany({
    where: { id: inquiryId },
    data: { adminSeenAt: new Date(), status: "SEEN" },
  });
  revalidateInboxPaths();
}
