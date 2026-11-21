import { BookingStatus, type LoyaltyTier } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveTierByCompletedStays } from "@/lib/loyalty-config";
import { higherLoyaltyTier } from "@/lib/returning-guest-shared";

/** Etiketlerden sezon yılı sayısı (2018–2026). */
export function countStaySeasonsFromTags(
  tags: { name: string }[]
): number {
  const years = new Set<string>();
  let hasKonaklama = false;

  for (const tag of tags) {
    const name = tag.name.trim();
    const upper = name.toLocaleUpperCase("tr-TR");
    if (upper.includes("KONAKLAMA")) hasKonaklama = true;

    const yearMatch = name.match(/(?:^|[^\d])(20(?:1[8-9]|2[0-6]))(?:[^\d]|$)/);
    if (yearMatch?.[1]) {
      years.add(yearMatch[1]);
      continue;
    }
    if (/^20(?:1[8-9]|2[0-6])$/.test(name)) {
      years.add(name);
    }
  }

  if (years.size > 0) return years.size;
  return hasKonaklama ? 1 : 0;
}

export async function getConfirmedStayCountByCustomerId(): Promise<
  Map<string, number>
> {
  const rows = await prisma.booking.groupBy({
    by: ["customerId"],
    where: {
      status: BookingStatus.CONFIRMED,
      customerId: { not: null },
    },
    _count: { _all: true },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.customerId) continue;
    map.set(row.customerId, row._count._all);
  }
  return map;
}

export function resolveCustomerStayCount(input: {
  bookingCount: number;
  tags: { name: string }[];
}): number {
  const fromTags = countStaySeasonsFromTags(input.tags);
  return Math.max(input.bookingCount, fromTags);
}

export function resolveCustomerLoyaltyTier(stayCount: number): LoyaltyTier {
  return resolveTierByCompletedStays(stayCount);
}

export type CustomerLoyaltySyncResult = {
  customersScanned: number;
  withStays: number;
  memberAccountsUpdated: number;
  unchanged: number;
};

/**
 * Tüm müşterilerin konaklama sayısını hesaplar;
 * bağlı MemberAccount kayıtlarında completedStays + loyaltyTier günceller.
 */
export async function syncAllCustomerLoyaltyFromStays(): Promise<CustomerLoyaltySyncResult> {
  const [stayByCustomer, customers] = await Promise.all([
    getConfirmedStayCountByCustomerId(),
    prisma.customer.findMany({
      select: {
        id: true,
        tags: { select: { tag: { select: { name: true } } } },
        memberAccount: {
          select: {
            id: true,
            completedStays: true,
            loyaltyTier: true,
          },
        },
      },
    }),
  ]);

  let withStays = 0;
  let memberAccountsUpdated = 0;
  let unchanged = 0;

  for (const customer of customers) {
    const stayCount = resolveCustomerStayCount({
      bookingCount: stayByCustomer.get(customer.id) ?? 0,
      tags: customer.tags.map((entry) => entry.tag),
    });
    if (stayCount > 0) withStays += 1;

    const loyaltyTier = resolveCustomerLoyaltyTier(stayCount);
    const member = customer.memberAccount;
    if (!member) continue;

    const nextStays = Math.max(member.completedStays, stayCount);
    const nextTier = higherLoyaltyTier(member.loyaltyTier, loyaltyTier);

    if (
      member.completedStays === nextStays &&
      member.loyaltyTier === nextTier
    ) {
      unchanged += 1;
      continue;
    }

    await prisma.memberAccount.update({
      where: { id: member.id },
      data: {
        completedStays: nextStays,
        loyaltyTier: nextTier,
      },
    });
    memberAccountsUpdated += 1;
  }

  return {
    customersScanned: customers.length,
    withStays,
    memberAccountsUpdated,
    unchanged,
  };
}
