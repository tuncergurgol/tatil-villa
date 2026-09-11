"use server";

import { prisma } from "@/lib/db";
import { validateCouponForBooking } from "@/lib/coupon-service";
import { getCurrentMember } from "@/lib/member-session.server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export type ValidateCouponState = {
  success?: boolean;
  error?: string;
  discountAmount?: number;
  couponCode?: string;
};

export async function validateCouponAction(input: {
  code: string;
  accommodationTotal: number;
}): Promise<ValidateCouponState> {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const member = await getCurrentMember();

  const result = await validateCouponForBooking(
    async (code) =>
      prisma.coupon.findFirst({
        where: { code: { equals: code, mode: "insensitive" } },
      }),
    {
      code: input.code,
      accommodationTotal: Math.round(input.accommodationTotal),
      siteKey: site.key,
      memberId: member?.id ?? null,
    }
  );

  if (!result.ok) return { error: result.error };

  return {
    success: true,
    discountAmount: result.discountAmount,
    couponCode: result.coupon.code,
  };
}
