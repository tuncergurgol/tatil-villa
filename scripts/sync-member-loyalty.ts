/**
 * Member sadakat sınıfını CRM / konaklama geçmişinden yükseltir (düşürmez).
 * Çalıştır: npx tsx scripts/sync-member-loyalty.ts
 *          npx tsx scripts/sync-member-loyalty.ts "İrfan Alp"
 */
import { prisma } from "../lib/db";
import { syncAllCustomerLoyaltyFromStays } from "../lib/customer-loyalty";
import { syncMemberLoyaltyFromHistory } from "../lib/member-account";
import { recognizeReturningGuest } from "../lib/returning-guest";

const query = process.argv.slice(2).join(" ").trim();

async function main() {
  if (!query) {
    const result = await syncAllCustomerLoyaltyFromStays();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const digits = query.replace(/\D/g, "").slice(-10);
  const or = [
    { fullName: { contains: query, mode: "insensitive" as const } },
    { email: { contains: query, mode: "insensitive" as const } },
    ...(digits.length >= 7 ? [{ phone: { contains: digits } }] : []),
  ];

  const members = await prisma.memberAccount.findMany({
    where: { OR: or },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      loyaltyTier: true,
      completedStays: true,
    },
  });

  const customers = await prisma.customer.findMany({
    where: { OR: or },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      memberAccount: { select: { id: true } },
    },
    take: 20,
  });

  console.log("members", members);
  console.log("customers", customers);

  for (const member of members) {
    const before = { ...member };
    const updated = await syncMemberLoyaltyFromHistory(member.id);
    const match = await recognizeReturningGuest({
      phone: member.phone,
      email: member.email,
    });
    console.log({
      before: {
        name: before.fullName,
        tier: before.loyaltyTier,
        stays: before.completedStays,
      },
      after: updated
        ? { tier: updated.loyaltyTier, stays: updated.completedStays }
        : null,
      recognized: match
        ? {
            name: match.fullName,
            tier: match.loyaltyTier,
            stays: match.stayCount,
            percent: match.discountPercent,
          }
        : null,
    });
  }

  for (const customer of customers) {
    if (customer.memberAccount) continue;
    const match = await recognizeReturningGuest({
      phone: customer.phone,
      email: customer.email,
    });
    console.log({
      customerWithoutMember: customer.fullName,
      recognized: match
        ? {
            tier: match.loyaltyTier,
            stays: match.stayCount,
            percent: match.discountPercent,
          }
        : null,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
