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
  villas: {
    select: {
      id: true,
      name: true,
      originalName: true,
      documentNo: true,
      image: true,
      slug: true,
    },
    orderBy: { name: "asc" },
  },
} as const;

export async function getActiveVillaOwners() {
  return prisma.villaOwner.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      type: true,
    },
    orderBy: { name: "asc" },
  });
}

export type ActiveVillaOwnerOption = Awaited<
  ReturnType<typeof getActiveVillaOwners>
>[number];

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
