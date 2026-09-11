import type { LoyaltyTier, LoyaltyVoucherType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getConfirmedStayCountByCustomerId,
  resolveCustomerLoyaltyTier,
  resolveCustomerStayCount,
} from "@/lib/customer-loyalty";
import { LOYALTY_TIER_ORDER } from "@/lib/loyalty-config";

export type AdminLoyaltyMemberItem = {
  /** Customer id (üyelik sınıfı müşteri listesiyle aynı kaynaktan) */
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
  customerId: string;
  /** Kayıtlı üye hesabı varsa; manuel çek için gerekli */
  memberAccountId: string | null;
  hasMemberAccount: boolean;
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
  registeredMemberCount: number;
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

function isClassifiedMember(input: {
  stayCount: number;
  hasMemberAccount: boolean;
}) {
  return input.stayCount > 0 || input.hasMemberAccount;
}

export async function getAdminLoyaltyPageData(): Promise<AdminLoyaltyPageData> {
  const now = new Date();

  const [customers, stayByCustomer, vouchers, registeredMemberCount] =
    await Promise.all([
      prisma.customer.findMany({
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          active: true,
          tags: {
            select: { tag: { select: { name: true } } },
          },
          memberAccount: {
            select: {
              id: true,
              completedStays: true,
              couponBalance: true,
              lastStayCompletedAt: true,
              loyaltyVouchers: {
                where: { usedAt: null, expiresAt: { gt: now } },
                select: { remainingAmount: true },
              },
            },
          },
        },
        orderBy: [{ fullName: "asc" }],
      }),
      getConfirmedStayCountByCustomerId(),
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
      prisma.memberAccount.count(),
    ]);

  const tierCounts = Object.fromEntries(
    LOYALTY_TIER_ORDER.map((tier) => [tier, 0])
  ) as Record<LoyaltyTier, number>;

  const memberItems: AdminLoyaltyMemberItem[] = [];

  for (const customer of customers) {
    const stayCount = resolveCustomerStayCount({
      bookingCount: stayByCustomer.get(customer.id) ?? 0,
      tags: customer.tags.map((entry) => entry.tag),
    });
    const hasMemberAccount = Boolean(customer.memberAccount);
    if (!isClassifiedMember({ stayCount, hasMemberAccount })) continue;

    const loyaltyTier = resolveCustomerLoyaltyTier(stayCount);
    tierCounts[loyaltyTier] += 1;

    const vouchersForMember = customer.memberAccount?.loyaltyVouchers ?? [];
    const activeVoucherTotal = vouchersForMember.reduce(
      (sum, voucher) => sum + voucher.remainingAmount,
      0
    );

    memberItems.push({
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      loyaltyTier,
      completedStays: stayCount,
      couponBalance: customer.memberAccount?.couponBalance ?? 0,
      active: customer.active,
      lastStayCompletedAt: customer.memberAccount?.lastStayCompletedAt ?? null,
      activeVoucherCount: vouchersForMember.length,
      activeVoucherTotal,
      customerId: customer.id,
      memberAccountId: customer.memberAccount?.id ?? null,
      hasMemberAccount,
    });
  }

  memberItems.sort((a, b) => {
    if (b.completedStays !== a.completedStays) {
      return b.completedStays - a.completedStays;
    }
    return a.fullName.localeCompare(b.fullName, "tr");
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
      memberCount: memberItems.length,
      activeMemberCount: memberItems.filter((member) => member.active).length,
      registeredMemberCount,
      tierCounts,
      activeVoucherCount: activeVouchers.length,
      activeVoucherTotal: activeVouchers.reduce(
        (sum, voucher) => sum + voucher.remainingAmount,
        0
      ),
      couponBalanceTotal: memberItems.reduce(
        (sum, member) => sum + member.couponBalance,
        0
      ),
    },
    members: memberItems,
    vouchers: voucherItems,
  };
}
