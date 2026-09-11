import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const enumRows = await prisma.$queryRaw`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'VillaDayOccupancy'
    ORDER BY e.enumsortorder
  `;

  console.log("PG enum:", enumRows.map((r) => r.enumlabel).join(", "));

  const hasReserved = enumRows.some((r) => r.enumlabel === "RESERVED");
  if (!hasReserved) {
    console.log("Adding RESERVED to PostgreSQL enum...");
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "VillaDayOccupancy" ADD VALUE IF NOT EXISTS 'RESERVED'`
    );
    const after = await prisma.$queryRaw`
      SELECT enumlabel FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'VillaDayOccupancy'
      ORDER BY e.enumsortorder
    `;
    console.log("PG enum after:", after.map((r) => r.enumlabel).join(", "));
  }

  const reservedCount = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint AS count FROM "VillaPricePeriodDay"
    WHERE "occupancyStatus"::text = 'RESERVED'
  `;
  console.log("RESERVED rows:", reservedCount[0]?.count?.toString() ?? "0");

  const sample = await prisma.villaPricePeriodDay.findFirst({
    where: { occupancyStatus: "RESERVED" },
    select: { id: true, occupancyStatus: true },
  });
  console.log("Prisma read sample:", sample);
}

main()
  .catch((error) => {
    console.error("FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
