/**
 * link1 = elitvillam.com olan villalarda boş MİN GECE alanlarını doldurur.
 *
 * Elitvillam haftalık (7 gecelik) fiyat modeli kullanır; scraper eskiden
 * minStayNights yazmadığı için periyotlar boş kalmış olabilir.
 *
 *   npx tsx scripts/fix-elitvillam-link1-min-stay.ts --dry-run
 *   npx tsx scripts/fix-elitvillam-link1-min-stay.ts
 *   npx tsx scripts/fix-elitvillam-link1-min-stay.ts --nights 7
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_NIGHTS = 7;

type Args = { dryRun: boolean; nights: number };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const nightsIdx = argv.indexOf("--nights");
  let nights = DEFAULT_NIGHTS;
  if (nightsIdx >= 0) {
    const raw = Number(argv[nightsIdx + 1]);
    if (!Number.isFinite(raw) || raw <= 0) {
      throw new Error("Geçersiz --nights değeri");
    }
    nights = Math.round(raw);
  }
  return { dryRun, nights };
}

async function main() {
  const args = parseArgs();

  const villas = await prisma.villa.findMany({
    where: {
      externalSyncUrl1: { contains: "elitvillam", mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      externalSyncUrl1: true,
      _count: {
        select: {
          pricePeriods: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log("link1 elitvillam villa:", villas.length);
  console.log("hedef min gece:", args.nights);
  console.log("mod:", args.dryRun ? "DRY-RUN" : "UYGULA");

  let villasWithGap = 0;
  let periodsNull = 0;
  let daysNull = 0;
  let periodsUpdated = 0;
  let daysUpdated = 0;

  for (const villa of villas) {
    const [nullPeriods, nullDays, sample] = await Promise.all([
      prisma.villaPricePeriod.count({
        where: { villaId: villa.id, minStayNights: null },
      }),
      prisma.villaPricePeriodDay.count({
        where: { villaId: villa.id, minStayNights: null },
      }),
      prisma.villaPricePeriod.findFirst({
        where: { villaId: villa.id },
        select: { minStayNights: true },
        orderBy: { startDate: "asc" },
      }),
    ]);

    if (nullPeriods === 0 && nullDays === 0) {
      continue;
    }

    villasWithGap += 1;
    periodsNull += nullPeriods;
    daysNull += nullDays;
    console.log(
      `- ${villa.name} | periyot boş=${nullPeriods}/${villa._count.pricePeriods} | gün boş=${nullDays} | örnek=${sample?.minStayNights ?? "null"} | ${villa.externalSyncUrl1}`
    );

    if (args.dryRun) continue;

    const periodResult = await prisma.villaPricePeriod.updateMany({
      where: { villaId: villa.id, minStayNights: null },
      data: { minStayNights: args.nights },
    });
    const dayResult = await prisma.villaPricePeriodDay.updateMany({
      where: { villaId: villa.id, minStayNights: null },
      data: { minStayNights: args.nights },
    });
    periodsUpdated += periodResult.count;
    daysUpdated += dayResult.count;
  }

  console.log("---");
  console.log("eksik min gece olan villa:", villasWithGap);
  console.log("boş periyot:", periodsNull, "| boş gün:", daysNull);
  if (!args.dryRun) {
    console.log("güncellenen periyot:", periodsUpdated, "| gün:", daysUpdated);
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
