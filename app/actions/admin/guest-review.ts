"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { sendGuestReviewInviteForBooking } from "@/lib/guest-review-invite";

export type GuestReviewAdminActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

function revalidateReviewPaths() {
  revalidatePath("/admin/musteri-yonetimi/yorumlar");
  revalidatePath("/yorumlar");
  revalidatePath("/");
}

export async function approveGuestReviewAction(
  id: string
): Promise<GuestReviewAdminActionState> {
  await requireAdmin();
  await prisma.guestReview.update({
    where: { id },
    data: { approved: true, rejectedReason: "" },
  });
  revalidateReviewPaths();
  return { success: true, message: "Yorum onaylandı ve yayına alındı" };
}

export async function rejectGuestReviewAction(
  id: string,
  reason?: string
): Promise<GuestReviewAdminActionState> {
  await requireAdmin();
  await prisma.guestReview.update({
    where: { id },
    data: {
      approved: false,
      rejectedReason: reason?.trim() || "Yönetici tarafından reddedildi",
    },
  });
  revalidateReviewPaths();
  return { success: true, message: "Yorum reddedildi" };
}

export async function sendGuestReviewInviteAction(
  bookingId: string,
  options?: { forceResend?: boolean }
): Promise<GuestReviewAdminActionState> {
  await requireAdmin();
  const result = await sendGuestReviewInviteForBooking(bookingId, options);
  if (!result.ok) {
    return { error: result.errors.join(" · ") || "Davet gönderilemedi" };
  }
  return {
    success: true,
    message: `Yorum daveti gönderildi${result.whatsappSent ? " (WhatsApp)" : ""}${result.emailSent ? " (E-posta)" : ""}`,
  };
}
