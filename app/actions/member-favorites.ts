"use server";

import { revalidatePath } from "next/cache";
import { MemberFavoriteItemType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session.server";

export async function getMemberFavoriteVillaIdsAction(): Promise<string[]> {
  const member = await getCurrentMember();
  if (!member) return [];

  const rows = await prisma.memberFavorite.findMany({
    where: { memberId: member.id, itemType: MemberFavoriteItemType.VILLA },
    select: { itemId: true },
  });
  return rows.map((row) => row.itemId);
}

export async function toggleMemberFavoriteVillaAction(villaId: string) {
  const member = await getCurrentMember();
  if (!member) {
    return { error: "Favori için üye girişi yapmalısınız", needsLogin: true };
  }
  if (!villaId.trim()) return { error: "Villa bulunamadı" };

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true },
  });
  if (!villa) return { error: "Villa bulunamadı" };

  const existing = await prisma.memberFavorite.findUnique({
    where: {
      memberId_itemType_itemId: {
        memberId: member.id,
        itemType: MemberFavoriteItemType.VILLA,
        itemId: villaId,
      },
    },
  });

  if (existing) {
    await prisma.memberFavorite.delete({ where: { id: existing.id } });
    revalidatePath("/uye/hesabim/begendiklerim");
    return { favorited: false };
  }

  await prisma.memberFavorite.create({
    data: {
      memberId: member.id,
      itemType: MemberFavoriteItemType.VILLA,
      itemId: villaId,
    },
  });
  revalidatePath("/uye/hesabim/begendiklerim");
  return { favorited: true };
}

export async function getMemberFavoriteVillasAction() {
  const member = await getCurrentMember();
  if (!member) return [];

  const favorites = await prisma.memberFavorite.findMany({
    where: { memberId: member.id, itemType: MemberFavoriteItemType.VILLA },
    orderBy: { createdAt: "desc" },
    select: { itemId: true, createdAt: true },
  });
  if (favorites.length === 0) return [];

  const villaIds = favorites.map((f) => f.itemId);
  const villas = await prisma.villa.findMany({
    where: { id: { in: villaIds }, active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      guests: true,
      bedrooms: true,
      bathrooms: true,
      pricePerNight: true,
      region: { select: { name: true } },
    },
  });

  const byId = new Map(villas.map((v) => [v.id, v]));
  return favorites
    .map((favorite) => {
      const villa = byId.get(favorite.itemId);
      if (!villa) return null;
      return {
        favoritedAt: favorite.createdAt,
        villa: {
          ...villa,
          regionName: villa.region.name,
        },
      };
    })
    .filter(Boolean);
}
