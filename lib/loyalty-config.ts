import type { LoyaltyTier } from "@prisma/client";

export const LOYALTY_TIER_ORDER: LoyaltyTier[] = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
];

export const LOYALTY_TIER_META: Record<
  LoyaltyTier,
  {
    label: string;
    emoji: string;
    requiredStays: number;
    voucherPercent: number;
    description: string;
  }
> = {
  BRONZE: {
    label: "Bronz",
    emoji: "🥉",
    requiredStays: 0,
    voucherPercent: 3,
    description: "Başlangıç üyelik sınıfı",
  },
  SILVER: {
    label: "Silver",
    emoji: "🥈",
    requiredStays: 1,
    voucherPercent: 5,
    description: "İlk konaklamadan sonra",
  },
  GOLD: {
    label: "Gold",
    emoji: "🥇",
    requiredStays: 2,
    voucherPercent: 6,
    description: "İki konaklama",
  },
  PLATINUM: {
    label: "Platin",
    emoji: "💎",
    requiredStays: 3,
    voucherPercent: 7,
    description: "Üç ve üzeri konaklama",
  },
};

export const LOYALTY_RULES = {
  voucherValidityDays: 365,
  minBookingMultiplier: 10,
  tierDecayMonths: 18,
  minTierAfterDecay: "SILVER" as LoyaltyTier,
  welcomeReferralDiscount: 1000,
  referralRewardAmount: 500,
} as const;

export function resolveTierByCompletedStays(stays: number): LoyaltyTier {
  if (stays >= 3) return "PLATINUM";
  if (stays >= 2) return "GOLD";
  if (stays >= 1) return "SILVER";
  return "BRONZE";
}

export function calculateTierVoucherAmount(
  tier: LoyaltyTier,
  accommodationTotal: number
) {
  const percent = LOYALTY_TIER_META[tier].voucherPercent;
  if (percent <= 0 || accommodationTotal <= 0) return 0;
  return Math.round((accommodationTotal * percent) / 100);
}
