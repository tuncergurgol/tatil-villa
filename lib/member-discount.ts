import { prisma } from "@/lib/db";
import { validateCouponForBooking } from "@/lib/coupon-service";
import { LOYALTY_RULES } from "@/lib/loyalty-config";
import type { PublicSiteKey } from "@/lib/public-site-keys";

export type MemberDiscountOffer = {
  amount: number;
  label: string;
  couponCode?: string;
  loyaltyVoucherId?: string;
  couponBalanceAmount?: number;
};

export async function resolveBestMemberDiscount(
  memberId: string,
  accommodationTotal: number,
  siteKey?: PublicSiteKey | null
): Promise<MemberDiscountOffer | null> {
  if (accommodationTotal <= 0) return null;

  const member = await prisma.memberAccount.findUnique({
    where: { id: memberId },
    select: { id: true, couponBalance: true },
  });
  if (!member) return null;

  const offers: MemberDiscountOffer[] = [];

  if (member.couponBalance > 0) {
    const amount = Math.min(member.couponBalance, accommodationTotal);
    if (amount > 0) {
      offers.push({
        amount,
        label: "Kupon bakiyesi",
        couponBalanceAmount: amount,
      });
    }
  }

  const vouchers = await prisma.loyaltyVoucher.findMany({
    where: {
      memberId,
      remainingAmount: { gt: 0 },
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    orderBy: { remainingAmount: "desc" },
  });

  for (const voucher of vouchers) {
    const minRequired =
      voucher.remainingAmount * LOYALTY_RULES.minBookingMultiplier;
    if (accommodationTotal < minRequired) continue;
    const amount = Math.min(voucher.remainingAmount, accommodationTotal);
    if (amount > 0) {
      offers.push({
        amount,
        label: "Sadakat çeki",
        loyaltyVoucherId: voucher.id,
      });
    }
  }

  const candidateCodes = new Set<string>();
  candidateCodes.add(`HOSGELDIN-${member.id.slice(-6).toUpperCase()}`);

  const memberCoupons = await prisma.coupon.findMany({
    where: {
      active: true,
      OR: [{ welcomeCoupon: true }, { memberOnly: true }],
    },
    select: { code: true },
    take: 50,
  });
  for (const row of memberCoupons) {
    candidateCodes.add(row.code.trim().toUpperCase());
  }

  for (const code of candidateCodes) {
    const result = await validateCouponForBooking(
      async (normalized) =>
        prisma.coupon.findFirst({
          where: { code: { equals: normalized, mode: "insensitive" } },
        }),
      {
        code,
        accommodationTotal,
        siteKey,
        memberId,
      }
    );
    if (result.ok && result.discountAmount > 0) {
      offers.push({
        amount: result.discountAmount,
        label: result.coupon.welcomeCoupon
          ? "Hoş geldin kuponu"
          : "Üye kuponu",
        couponCode: result.coupon.code,
      });
    }
  }

  if (offers.length === 0) return null;
  return offers.sort((a, b) => b.amount - a.amount)[0] ?? null;
}
