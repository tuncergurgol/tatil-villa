import type { LoyaltyTier } from "@prisma/client";
import { LOYALTY_TIER_META, LOYALTY_TIER_ORDER } from "@/lib/loyalty-config";

export type ReturningGuestMatch = {
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  loyaltyTier: LoyaltyTier;
  discountPercent: number;
  stayCount: number;
  hasMemberAccount: boolean;
  memberId: string | null;
  customerId: string | null;
  welcomeTitle: string;
  welcomeBody: string;
};

export type ReturningGuestPreview = {
  firstName: string;
  fullName?: string;
  loyaltyTier: LoyaltyTier;
  discountPercent: number;
  stayCount: number;
  hasMemberAccount: boolean;
  welcomeTitle: string;
  welcomeBody: string;
  applyDiscount: boolean;
};

export function firstNameFromFullName(fullName: string): string {
  const first = fullName.trim().split(/\s+/).find(Boolean) ?? "";
  if (!first) return "";
  const head = first.charAt(0).toLocaleUpperCase("tr-TR");
  const rest = first.slice(1).toLocaleLowerCase("tr-TR");
  return `${head}${rest}`;
}

export function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return {
    first: parts[0] ?? "",
    last: parts.slice(1).join(" "),
  };
}

export function shouldAutoApplyLoyaltyDiscount(match: {
  stayCount: number;
  loyaltyTier: LoyaltyTier;
}): boolean {
  return match.stayCount > 0 || match.loyaltyTier !== "BRONZE";
}

export function raiseAgencyDiscountForLoyalty(input: {
  grossPrice: number | null | undefined;
  agencyDiscountRate: number;
  agencyDiscountAmount: number;
  loyaltyPercent: number;
}): {
  agencyDiscountRate: number;
  agencyDiscountAmount: number;
  raised: boolean;
} {
  const currentRate = input.agencyDiscountRate || 0;
  if (input.loyaltyPercent <= currentRate) {
    return {
      agencyDiscountRate: currentRate,
      agencyDiscountAmount: input.agencyDiscountAmount || 0,
      raised: false,
    };
  }
  const gross = input.grossPrice;
  const amount =
    gross != null && Number.isFinite(gross)
      ? Math.round((gross * input.loyaltyPercent) / 100)
      : input.agencyDiscountAmount || 0;
  return {
    agencyDiscountRate: input.loyaltyPercent,
    agencyDiscountAmount: amount,
    raised: true,
  };
}

export function higherLoyaltyTier(a: LoyaltyTier, b: LoyaltyTier): LoyaltyTier {
  return LOYALTY_TIER_ORDER.indexOf(a) >= LOYALTY_TIER_ORDER.indexOf(b) ? a : b;
}

export function buildReturningGuestWelcome(input: {
  fullName: string;
  loyaltyTier: LoyaltyTier;
  stayCount: number;
}): { welcomeTitle: string; welcomeBody: string } {
  const firstName = firstNameFromFullName(input.fullName);
  const meta = LOYALTY_TIER_META[input.loyaltyTier];
  const welcomeTitle = firstName
    ? `Sizi hatırladık, ${firstName}`
    : "Sizi hatırladık";

  if (input.stayCount <= 0 && input.loyaltyTier === "BRONZE") {
    return {
      welcomeTitle,
      welcomeBody:
        "Telefonunuz veya e-postanız sistemimizde kayıtlı. Tekrar aramıza hoş geldiniz.",
    };
  }

  return {
    welcomeTitle,
    welcomeBody: `${meta.emoji} ${meta.label} misafirimizsiniz. Konaklama bedeline %${meta.voucherPercent} sadakat indirimi sizi bekliyor.`,
  };
}

export function toReturningGuestPreview(
  match: ReturningGuestMatch,
  options?: { includeFullName?: boolean }
): ReturningGuestPreview {
  return {
    firstName: match.firstName,
    ...(options?.includeFullName ? { fullName: match.fullName } : {}),
    loyaltyTier: match.loyaltyTier,
    discountPercent: match.discountPercent,
    stayCount: match.stayCount,
    hasMemberAccount: match.hasMemberAccount,
    welcomeTitle: match.welcomeTitle,
    welcomeBody: match.welcomeBody,
    applyDiscount: shouldAutoApplyLoyaltyDiscount(match),
  };
}
