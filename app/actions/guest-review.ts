"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { formatGuestReviewStayMonth } from "@/lib/guest-review-invite";
import { getCompanySettings } from "@/lib/queries/company-settings";

const submitSchema = z.object({
  token: z.string().min(8),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(20, "Yorum en az 20 karakter olmalı").max(4000),
  guestCity: z.string().max(80).optional(),
});

export type GuestReviewSubmitState = {
  success?: boolean;
  error?: string;
  googleReviewUrl?: string;
};

export async function getGuestReviewInvitePageData(token: string) {
  const invitation = await prisma.guestReviewInvitation.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          villa: { select: { name: true, originalName: true } },
          guestReview: { select: { id: true } },
        },
      },
    },
  });

  if (!invitation) return null;
  if (invitation.usedAt || invitation.booking.guestReview) {
    return { used: true as const };
  }
  if (invitation.expiresAt < new Date()) return { expired: true as const };

  const company = await getCompanySettings();

  return {
    used: false as const,
    expired: false as const,
    guestName: invitation.booking.guestName,
    villaName:
      invitation.booking.villa.originalName || invitation.booking.villa.name,
    checkOut: invitation.booking.checkOut,
    googleReviewUrl: company.googleReviewUrl?.trim() || "",
  };
}

export async function submitGuestReviewAction(
  _prev: GuestReviewSubmitState,
  formData: FormData
): Promise<GuestReviewSubmitState> {
  const parsed = submitSchema.safeParse({
    token: formData.get("token"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    comment: formData.get("comment"),
    guestCity: formData.get("guestCity") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const invitation = await prisma.guestReviewInvitation.findUnique({
    where: { token: parsed.data.token },
    include: {
      booking: {
        include: {
          villa: { select: { id: true } },
          guestReview: { select: { id: true } },
        },
      },
    },
  });

  if (!invitation) return { error: "Geçersiz veya süresi dolmuş bağlantı" };
  if (invitation.expiresAt < new Date()) {
    return { error: "Bu yorum bağlantısının süresi dolmuş" };
  }
  if (invitation.usedAt || invitation.booking.guestReview) {
    return { error: "Bu bağlantı ile zaten yorum gönderilmiş" };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.guestReview.create({
      data: {
        guestName: invitation.booking.guestName,
        guestCity: parsed.data.guestCity?.trim() ?? "",
        rating: parsed.data.rating,
        title: parsed.data.title?.trim() ?? "",
        comment: parsed.data.comment.trim(),
        villaId: invitation.booking.villa.id,
        bookingId: invitation.booking.id,
        invitationId: invitation.id,
        stayMonth: formatGuestReviewStayMonth(invitation.booking.checkOut),
        source: "guest_invite",
        approved: false,
        featured: false,
        submittedAt: now,
      },
    });

    await tx.guestReviewInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: now },
    });
  });

  revalidatePath("/yorumlar");
  revalidatePath("/admin/icerik");

  const company = await getCompanySettings();

  return {
    success: true,
    googleReviewUrl: company.googleReviewUrl?.trim() || "",
  };
}
