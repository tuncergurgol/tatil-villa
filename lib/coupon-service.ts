import type { Coupon } from "@prisma/client";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { LOYALTY_RULES } from "@/lib/loyalty-config";

export type CouponValidationInput = {
  code: string;
  accommodationTotal: number;
  siteKey?: PublicSiteKey | null;
  memberId?: string | null;
};

export type CouponValidationResult =
  | {
      ok: true;
      coupon: Coupon;
      discountAmount: number;
    }
  | {
      ok: false;
      error: string;
    };

function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function calculateCouponDiscount(
  coupon: Pick<Coupon, "discountType" | "discountValue" | "maxDiscountAmount">,
  accommodationTotal: number
) {
  if (accommodationTotal <= 0) return 0;

  let discount =
    coupon.discountType === "PERCENT"
      ? Math.round((accommodationTotal * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscountAmount != null) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  return Math.max(0, Math.min(discount, accommodationTotal));
}

export async function validateCouponForBooking(
  prismaCouponFind: (code: string) => Promise<Coupon | null>,
  input: CouponValidationInput
): Promise<CouponValidationResult> {
  const normalizedCode = normalizeCouponCode(input.code);
  if (!normalizedCode) {
    return { ok: false, error: "Kupon kodu girin" };
  }

  const coupon = await prismaCouponFind(normalizedCode);
  if (!coupon || !coupon.active) {
    return { ok: false, error: "Geçersiz kupon kodu" };
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return { ok: false, error: "Kupon henüz geçerli değil" };
  }
  if (coupon.validTo && coupon.validTo < now) {
    return { ok: false, error: "Kupon süresi dolmuş" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "Kupon kullanım limitine ulaşılmış" };
  }
  if (coupon.siteKey && input.siteKey && coupon.siteKey !== input.siteKey) {
    return { ok: false, error: "Bu kupon bu sitede geçerli değil" };
  }
  if (coupon.memberOnly && !input.memberId) {
    return { ok: false, error: "Bu kupon yalnızca üyeler için geçerlidir" };
  }

  const discountAmount = calculateCouponDiscount(
    coupon,
    input.accommodationTotal
  );
  if (discountAmount <= 0) {
    return { ok: false, error: "Kupon bu rezervasyona uygulanamaz" };
  }

  const minRequired =
    discountAmount * (coupon.minBookingMultiplier || LOYALTY_RULES.minBookingMultiplier);
  if (input.accommodationTotal < minRequired) {
    return {
      ok: false,
      error: `Kupon kullanımı için konaklama bedeli en az ${minRequired.toLocaleString("tr-TR")} TL olmalıdır`,
    };
  }

  return { ok: true, coupon, discountAmount };
}
