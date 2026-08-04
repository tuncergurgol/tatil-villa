import { prisma } from "@/lib/db";
import { validateCouponForBooking } from "@/lib/coupon-service";
import { LOYALTY_RULES } from "@/lib/loyalty-config";
import type { PublicSiteKey } from "@/lib/public-site-keys";

export type ValidatedMemberDiscount = {
  amount: number;
  couponCode?: string;
  loyaltyVoucherId?: string;
  couponBalanceAmount?: number;
};

export async function validateMemberDiscountSubmission(
  memberId: string,
  accommodationTotal: number,
  siteKey: PublicSiteKey | null | undefined,
  input: {
    requestedAmount: number;
    couponCode?: string;
    loyaltyVoucherId?: string;
    couponBalanceAmount?: number;
  }
): Promise<{ ok: true; discount: ValidatedMemberDiscount } | { ok: false; error: string }> {
  if (input.requestedAmount <= 0) {
    return { ok: true, discount: { amount: 0 } };
  }

  if (input.couponCode?.trim()) {
    const couponResult = await validateCouponForBooking(
      async (code) =>
        prisma.coupon.findFirst({
          where: { code: { equals: code, mode: "insensitive" } },
        }),
      {
        code: input.couponCode,
        accommodationTotal,
        siteKey,
        memberId,
      }
    );
    if (!couponResult.ok) return { ok: false, error: couponResult.error };
    if (couponResult.discountAmount !== input.requestedAmount) {
      return {
        ok: false,
        error: "İndirim tutarı güncellendi, lütfen tekrar deneyin",
      };
    }
    return {
      ok: true,
      discount: {
        amount: couponResult.discountAmount,
        couponCode: couponResult.coupon.code,
      },
    };
  }

  if (input.loyaltyVoucherId?.trim()) {
    const voucher = await prisma.loyaltyVoucher.findFirst({
      where: {
        id: input.loyaltyVoucherId,
        memberId,
        remainingAmount: { gt: 0 },
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });
    if (!voucher) return { ok: false, error: "Sadakat çeki geçerli değil" };
    const minRequired =
      voucher.remainingAmount * LOYALTY_RULES.minBookingMultiplier;
    if (accommodationTotal < minRequired) {
      return {
        ok: false,
        error: `Sadakat çeki için konaklama bedeli en az ${minRequired.toLocaleString("tr-TR")} TL olmalıdır`,
      };
    }
    const amount = Math.min(voucher.remainingAmount, accommodationTotal);
    if (amount !== input.requestedAmount) {
      return {
        ok: false,
        error: "İndirim tutarı güncellendi, lütfen tekrar deneyin",
      };
    }
    return {
      ok: true,
      discount: { amount, loyaltyVoucherId: voucher.id },
    };
  }

  if (input.couponBalanceAmount && input.couponBalanceAmount > 0) {
    const member = await prisma.memberAccount.findUnique({
      where: { id: memberId },
      select: { couponBalance: true },
    });
    if (!member) return { ok: false, error: "Üye hesabı bulunamadı" };
    const amount = Math.min(member.couponBalance, accommodationTotal);
    if (amount !== input.requestedAmount || amount !== input.couponBalanceAmount) {
      return {
        ok: false,
        error: "Kupon bakiyesi güncellendi, lütfen tekrar deneyin",
      };
    }
    return {
      ok: true,
      discount: { amount, couponBalanceAmount: amount },
    };
  }

  return { ok: false, error: "Geçersiz indirim bilgisi" };
}

export async function applyMemberDiscountAfterBooking(
  memberId: string,
  bookingId: string,
  discount: ValidatedMemberDiscount
) {
  if (discount.amount <= 0) return;

  if (discount.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: { equals: discount.couponCode, mode: "insensitive" } },
    });
    if (!coupon) return;
    await prisma.$transaction([
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
      prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          memberId,
          bookingId,
          discountAmount: discount.amount,
        },
      }),
    ]);
    return;
  }

  if (discount.loyaltyVoucherId) {
    const voucher = await prisma.loyaltyVoucher.findFirst({
      where: { id: discount.loyaltyVoucherId, memberId },
    });
    if (!voucher) return;
    const remaining = Math.max(0, voucher.remainingAmount - discount.amount);
    await prisma.loyaltyVoucher.update({
      where: { id: voucher.id },
      data: {
        remainingAmount: remaining,
        usedAt: remaining <= 0 ? new Date() : voucher.usedAt,
        bookingId: voucher.bookingId ?? bookingId,
      },
    });
    return;
  }

  if (discount.couponBalanceAmount && discount.couponBalanceAmount > 0) {
    await prisma.memberAccount.update({
      where: { id: memberId },
      data: {
        couponBalance: { decrement: discount.couponBalanceAmount },
      },
    });
  }
}
