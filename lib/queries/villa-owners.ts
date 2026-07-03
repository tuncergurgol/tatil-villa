import { prisma } from "@/lib/db";

const ownerSelect = {
  id: true,
  type: true,
  name: true,
  firstName: true,
  lastName: true,
  companyTitle: true,
  authorizedPersonName: true,
  phone: true,
  email: true,
  tcKimlikNo: true,
  taxOffice: true,
  taxNumber: true,
  bankAccountHolder: true,
  bankIban: true,
  accountingCode: true,
  country: true,
  mernisIlceCode: true,
  address: true,
  active: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: { villas: true },
  },
} as const;

export async function getVillaOwners() {
  return prisma.villaOwner.findMany({
    select: ownerSelect,
    orderBy: { name: "asc" },
  });
}

export async function getUnlinkedUsers() {
  return prisma.user.findMany({
    where: {
      villaOwner: null,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
    orderBy: { name: "asc" },
  });
}

export type VillaOwnerListItem = Awaited<
  ReturnType<typeof getVillaOwners>
>[number];
