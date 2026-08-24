import type { LoyaltyTier, LoyaltyVoucherType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LOYALTY_TIER_ORDER } from "@/lib/loyalty-config";

export type AdminLoyaltyMemberItem = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  loyaltyTier: LoyaltyTier;
  completedStays: number;
  couponBalance: number;
  active: boolean;
  lastStayCompletedAt: Date | null;
  activeVoucherCount: number;
  activeVoucherTotal: number;
  customerId: string | null;
};

export type AdminLoyaltyVoucherItem = {
  id: string;
  amount: number;
  remainingAmount: number;
  discountPercent: number | null;
  type: LoyaltyVoucherType;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  memberId: string;
  memberName: string;
  memberPhone: string;
  bookingCode: string | null;
};

export type AdminLoyaltyStats = {
  memberCount: number;
  activeMemberCount: number;
  tierCounts: Record<LoyaltyTier, number>;
  activeVoucherCount: number;
  activeVoucherTotal: number;
  couponBalanceTotal: number;
};

export type AdminLoyaltyPageData = {
  stats: AdminLoyaltyStats;
  members: AdminLoyaltyMemberItem[];
  vouchers: AdminLoyaltyVoucherItem[];
};

export async function getAdminLoyaltyPageData(): Promise<AdminLoyaltyPageData> {
  const now = new Date();

  const [members, vouchers, tierGroups, memberCount, activeMemberCount] =
    await Promise.all([
      prisma.memberAccount.findMany({
        orderBy: [{ completedStays: "desc" }, { updatedAt: "desc" }],
        take: 500,
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          loyaltyTier: true,
          completedStays: true,
          couponBalance: true,
          active: true,
          lastStayCompletedAt: true,
          customerId: true,
          loyaltyVouchers: {
            where: { usedAt: null, expiresAt: { gt: now } },
            select: { remainingAmount: true },
          },
        },
      }),
      prisma.loyaltyVoucher.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 300,
        select: {
          id: true,
          amount: true,
          remainingAmount: true,
          discountPercent: true,
          type: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
          memberId: true,
          member: { select: { fullName: true, phone: true } },
          booking: { select: { externalCode: true } },
        },
      }),
      prisma.memberAccount.groupBy({
        by: ["loyaltyTier"],
        _count: { _all: true },
      }),
      prisma.memberAccount.count(),
      prisma.memberAccount.count({ where: { active: true } }),
    ]);

  const tierCounts = Object.fromEntries(
    LOYALTY_TIER_ORDER.map((tier) => [tier, 0])
  ) as Record<LoyaltyTier, number>;
  for (const row of tierGroups) {
    tierCounts[row.loyaltyTier] = row._count._all;
  }

  const memberItems: AdminLoyaltyMemberItem[] = members.map((member) => {
    const activeVoucherTotal = member.loyaltyVouchers.reduce(
      (sum, voucher) => sum + voucher.remainingAmount,
      0
    );
    return {
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      email: member.email,
      loyaltyTier: member.loyaltyTier,
      completedStays: member.completedStays,
      couponBalance: member.couponBalance,
      active: member.active,
      lastStayCompletedAt: member.lastStayCompletedAt,
      activeVoucherCount: member.loyaltyVouchers.length,
      activeVoucherTotal,
      customerId: member.customerId,
    };
  });

  const voucherItems: AdminLoyaltyVoucherItem[] = vouchers.map((voucher) => ({
    id: voucher.id,
    amount: voucher.amount,
    remainingAmount: voucher.remainingAmount,
    discountPercent: voucher.discountPercent,
    type: voucher.type,
    expiresAt: voucher.expiresAt,
    usedAt: voucher.usedAt,
    createdAt: voucher.createdAt,
    memberId: voucher.memberId,
    memberName: voucher.member.fullName,
    memberPhone: voucher.member.phone,
    bookingCode:
      voucher.booking?.externalCode != null
        ? String(voucher.booking.externalCode)
        : null,
  }));

  const activeVouchers = voucherItems.filter(
    (voucher) => !voucher.usedAt && voucher.expiresAt > now
  );

  return {
    stats: {
      memberCount,
      activeMemberCount,
      tierCounts,
      activeVoucherCount: activeVouchers.length,
      activeVoucherTotal: activeVouchers.reduce(
        (sum, voucher) => sum + voucher.remainingAmount,
        0
      ),
      couponBalanceTotal: members.reduce(
        (sum, member) => sum + member.couponBalance,
        0
      ),
    },
    members: memberItems,
    vouchers: voucherItems,
  };
}
