"use server";

import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { resolveBestMemberDiscount } from "@/lib/member-discount";
import { resolveMemberContactProfile } from "@/lib/member-profile";
import { getCurrentMember } from "@/lib/member-session.server";

export type MemberBookingBenefits = {
  loggedIn: boolean;
  guest?: {
    fullName: string;
    email: string;
    phone: string;
  };
  autoDiscount?: {
    amount: number;
    label: string;
    couponCode?: string;
    loyaltyVoucherId?: string;
    couponBalanceAmount?: number;
  };
};

export async function getMemberBookingBenefitsAction(
  accommodationTotal: number
): Promise<MemberBookingBenefits> {
  const member = await getCurrentMember();
  if (!member) return { loggedIn: false };

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const profile = await resolveMemberContactProfile(member.id);
  const autoDiscount = await resolveBestMemberDiscount(
    member.id,
    Math.round(accommodationTotal),
    site.key
  );

  return {
    loggedIn: true,
    guest: profile
      ? {
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
        }
      : {
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
        },
    autoDiscount: autoDiscount
      ? {
          amount: autoDiscount.amount,
          label: autoDiscount.label,
          couponCode: autoDiscount.couponCode,
          loyaltyVoucherId: autoDiscount.loyaltyVoucherId,
          couponBalanceAmount: autoDiscount.couponBalanceAmount,
        }
      : undefined,
  };
}
