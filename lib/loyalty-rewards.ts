import type { Booking, MemberAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  LOYALTY_RULES,
  calculateTierVoucherAmount,
  resolveTierByCompletedStays,
} from "@/lib/loyalty-config";

export async function processCompletedStayRewards(booking: Booking) {
  if (!booking.memberId) return;

  const member = await prisma.memberAccount.findUnique({
    where: { id: booking.memberId },
    include: { invitedReferral: true },
  });
  if (!member) return;

  const completedStays = member.completedStays + 1;
  const loyaltyTier = resolveTierByCompletedStays(completedStays);
  const details =
    booking.details && typeof booking.details === "object"
      ? (booking.details as { grossPrice?: number })
      : {};
  const accommodationTotal = Number(details.grossPrice ?? booking.totalPrice ?? 0);
  const voucherAmount = calculateTierVoucherAmount(
    loyaltyTier,
    accommodationTotal
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LOYALTY_RULES.voucherValidityDays);

  await prisma.$transaction(async (tx) => {
    await tx.memberAccount.update({
      where: { id: member.id },
      data: {
        completedStays,
        loyaltyTier,
        lastStayCompletedAt: new Date(),
      },
    });

    if (voucherAmount > 0) {
      await tx.loyaltyVoucher.create({
        data: {
          memberId: member.id,
          amount: voucherAmount,
          remainingAmount: voucherAmount,
          discountPercent: null,
          type: "TIER_STAY",
          expiresAt,
          bookingId: booking.id,
        },
      });
    }

    if (member.invitedReferral && member.invitedReferral.status === "PENDING") {
      await tx.memberReferral.update({
        where: { id: member.invitedReferral.id },
        data: {
          status: "REWARDED",
          firstBookingId: booking.id,
          completedAt: new Date(),
          rewardedAt: new Date(),
          rewardAmount: LOYALTY_RULES.referralRewardAmount,
        },
      });
      await tx.memberAccount.update({
        where: { id: member.invitedReferral.inviterMemberId },
        data: {
          couponBalance: {
            increment: LOYALTY_RULES.referralRewardAmount,
          },
        },
      });
    }
  });
}

export async function applyTierDecayIfNeeded(member: MemberAccount) {
  if (!member.lastStayCompletedAt) return member.loyaltyTier;
  const monthsSince =
    (Date.now() - member.lastStayCompletedAt.getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  if (monthsSince < LOYALTY_RULES.tierDecayMonths) return member.loyaltyTier;

  const order = ["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;
  const currentIndex = order.indexOf(member.loyaltyTier);
  const minIndex = order.indexOf(LOYALTY_RULES.minTierAfterDecay);
  if (currentIndex <= minIndex) return member.loyaltyTier;

  const nextTier = order[Math.max(minIndex, currentIndex - 1)];
  await prisma.memberAccount.update({
    where: { id: member.id },
    data: { loyaltyTier: nextTier },
  });
  return nextTier;
}
