import { prisma } from "@/lib/db";

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

    await prisma.villaRoom.createMany({
      data: Array.from({ length: toCreate }, (_, offset) => ({
        villaId,
        roomType: "yatak_odasi",
        name: String(startIndex + offset + 1),
        sortOrder: startIndex + offset + 1,
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
  return prisma.villaRoom.findMany({
    where: { villaId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
