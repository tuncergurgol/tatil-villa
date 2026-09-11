import { prisma } from "../lib/db";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

async function main() {
  const villas = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { contains: "Bala", mode: "insensitive" } },
        { slug: { contains: "bala", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      externalSyncLastMessage1: true,
    },
    orderBy: { villaId: "asc" },
  });

  console.log("Villalar:");
  for (const v of villas) {
    console.log(
      `${v.villaId} | ${v.name} | ${v.slug} | link1=${v.externalSyncUrl1 || "-"}`
    );
  }

  const villa =
    villas.find((v) => /bala\s*2|bala-2/i.test(v.name)) ??
    villas.find((v) => v.slug.includes("bala-2")) ??
    villas[0];

  if (!villa) return;

  console.log("\nHedef:", villa.name, villa.id);

  const days = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: new Date("2026-08-10T00:00:00.000Z"),
        lte: new Date("2026-08-20T00:00:00.000Z"),
      },
    },
    select: { date: true, occupancyStatus: true, nightlyPrice: true },
    orderBy: { date: "asc" },
  });

  console.log("\nDB 10-20 Ağu:");
  for (const d of days) {
    console.log(dbDateToDateKey(d.date), d.occupancyStatus);
  }

  const blocks = await prisma.villaIcalImportedBlock.findMany({
    where: {
      villaId: villa.id,
      startDate: { lte: new Date("2026-08-20T00:00:00.000Z") },
      endDate: { gte: new Date("2026-08-10T00:00:00.000Z") },
    },
    include: { source: { select: { name: true, url: true } } },
  });
  console.log("\nImported blocks:");
  for (const b of blocks) {
    console.log(
      b.externalUid,
      dbDateToDateKey(b.startDate),
      "->",
      dbDateToDateKey(b.endDate),
      b.source.name
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
