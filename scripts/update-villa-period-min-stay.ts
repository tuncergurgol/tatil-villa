/**
 * Villa periyotlarında minimum konaklama gününü toplu günceller.
 *
 * Kullanım:
 *   npx tsx scripts/update-villa-period-min-stay.ts --dry-run --names-file list.txt
 *   npx tsx scripts/update-villa-period-min-stay.ts --names-file list.txt --nights 3
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_NIGHTS = 3;

type Args = {
  dryRun: boolean;
  names: string[];
  nights: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const namesFileIdx = argv.indexOf("--names-file");
  if (namesFileIdx < 0) {
    throw new Error("--names-file gerekli");
  }
  const path = argv[namesFileIdx + 1];
  if (!path) throw new Error("--names-file için dosya yolu gerekli");

  const nightsIdx = argv.indexOf("--nights");
  let nights = DEFAULT_NIGHTS;
  if (nightsIdx >= 0) {
    const raw = argv[nightsIdx + 1];
    if (!raw) throw new Error("--nights için değer gerekli");
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Geçersiz gece sayısı");
    }
    nights = Math.round(value);
  }

  const names = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return { dryRun, names, nights };
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

async function resolveVillas(names: string[]) {
  const all = await prisma.villa.findMany({
    select: { id: true, name: true, originalName: true },
  });
  const byName = new Map<string, (typeof all)[number]>();
  for (const villa of all) {
    byName.set(normalizeName(villa.name), villa);
    if (villa.originalName) {
      byName.set(normalizeName(villa.originalName), villa);
    }
  }

  const matched: (typeof all)[number][] = [];
  const missing: string[] = [];

  for (const rawName of names) {
    const villa = byName.get(normalizeName(rawName));
    if (villa) {
      if (!matched.some((item) => item.id === villa.id)) {
        matched.push(villa);
      }
    } else {
      missing.push(rawName);
    }
  }

  return { villas: matched, missing };
}

async function main() {
  const args = parseArgs();
  const { villas, missing } = await resolveVillas(args.names);

  if (missing.length > 0) {
    console.log("Eşleşmeyen villa adları:", missing.length);
    for (const name of missing) console.log("  -", name);
  }

  if (villas.length === 0) {
    console.log("Güncellenecek villa bulunamadı.");
    return;
  }

  const villaIds = villas.map((villa) => villa.id);
  const [periodCount, dayCount] = await Promise.all([
    prisma.villaPricePeriod.count({ where: { villaId: { in: villaIds } } }),
    prisma.villaPricePeriodDay.count({ where: { villaId: { in: villaIds } } }),
  ]);

  console.log("Villa sayısı:", villas.length);
  console.log("Periyot sayısı:", periodCount);
  console.log("Gün kaydı sayısı:", dayCount);
  console.log("Hedef minimum konaklama:", args.nights, "gece");
  console.log("Mod:", args.dryRun ? "DRY-RUN" : "UYGULA");

  for (const villa of villas) {
    console.log(" -", villa.name);
  }

  if (args.dryRun) {
    console.log("Dry-run tamamlandı; veritabanı değiştirilmedi.");
    return;
  }

  const periodResult = await prisma.villaPricePeriod.updateMany({
    where: { villaId: { in: villaIds } },
    data: { minStayNights: args.nights },
  });

  const dayResult = await prisma.villaPricePeriodDay.updateMany({
    where: { villaId: { in: villaIds } },
    data: { minStayNights: args.nights },
  });

  console.log(
    "Güncellendi: %d periyot, %d gün kaydı",
    periodResult.count,
    dayResult.count
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
