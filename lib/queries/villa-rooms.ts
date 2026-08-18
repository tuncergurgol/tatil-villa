import { prisma } from "@/lib/db";
import {
  isDefaultRoomFeature,
  uniqueRoomFeatures,
} from "@/lib/villa-room-features";

function sameStringList(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export async function syncVillaRoomFeatureCatalog(
  villaId: string,
  extraCustomFeatures: string[] = []
) {
  const rooms = await prisma.villaRoom.findMany({
    where: { villaId },
    select: { id: true, features: true, customFeatures: true },
  });
  const catalog = uniqueRoomFeatures([
    ...rooms.flatMap((room) => room.customFeatures),
    ...extraCustomFeatures,
  ]).filter((feature) => !isDefaultRoomFeature(feature));

  const dirty = rooms.filter((room) => {
    const nextFeatures = uniqueRoomFeatures(room.features);
    return (
      !sameStringList(room.features, nextFeatures) ||
      !sameStringList(room.customFeatures, catalog)
    );
  });

  if (dirty.length > 0) {
    await prisma.$transaction(
      dirty.map((room) =>
        prisma.villaRoom.update({
          where: { id: room.id },
          data: {
            features: uniqueRoomFeatures(room.features),
            customFeatures: catalog,
          },
        })
      )
    );
  }

  return { catalog, updatedCount: dirty.length };
}

export async function syncVillaRooms(villaId: string) {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { bedrooms: true },
  });

  if (!villa) return [];

  const targetCount = Math.max(0, villa.bedrooms);
  const existing = await prisma.villaRoom.findMany({
    where: { villaId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (existing.length > targetCount) {
    const toRemove = existing.slice(targetCount);
    await prisma.villaRoom.deleteMany({
      where: { id: { in: toRemove.map((room) => room.id) } },
    });
  }

  if (existing.length < targetCount) {
    const toCreate = targetCount - existing.length;
    const startIndex = existing.length;
    const sharedCustomFeatures = uniqueRoomFeatures(
      existing.flatMap((room) => room.customFeatures)
    ).filter((feature) => !isDefaultRoomFeature(feature));

    await prisma.villaRoom.createMany({
      data: Array.from({ length: toCreate }, (_, offset) => ({
        villaId,
        roomType: "yatak_odasi",
        name: String(startIndex + offset + 1),
        sortOrder: startIndex + offset + 1,
        customFeatures: sharedCustomFeatures,
      })),
    });
  }

  return prisma.villaRoom.findMany({
    where: { villaId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getVillaRoomsForTab(villaId: string) {
  await syncVillaRooms(villaId);
  await syncVillaRoomFeatureCatalog(villaId);
  return prisma.villaRoom.findMany({
    where: { villaId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function sanitizeAllVillaRoomFeatures() {
  const villas = await prisma.villaRoom.findMany({
    distinct: ["villaId"],
    select: { villaId: true },
  });
  let updatedVillas = 0;
  let updatedRooms = 0;
  for (const villa of villas) {
    const result = await syncVillaRoomFeatureCatalog(villa.villaId);
    if (result.updatedCount > 0) {
      updatedVillas += 1;
      updatedRooms += result.updatedCount;
    }
  }
  return { villaCount: villas.length, updatedVillas, updatedRooms };
}
