/**
 * Villa periyotlarında ön ödeme ve komisyon oranlarını toplu günceller.
 *
 * Kullanım:
 *   npx tsx scripts/update-villa-period-rates.ts --dry-run
 *   npx tsx scripts/update-villa-period-rates.ts --names-file villalar.txt
 *   npx tsx scripts/update-villa-period-rates.ts --excel "G:/Drive'ım/.../Rezervasyon Takip - 2026.xlsx"
 *   npx tsx scripts/update-villa-period-rates.ts --prefix "Villa"
 *   npx tsx scripts/update-villa-period-rates.ts --names-file list.txt --commission-only
 *   npx tsx scripts/update-villa-period-rates.ts --names-file list.txt --prepayment-only --rate 35
 *
 * Varsayılan: --prefix "Villa" (adı Villa ile başlayan tüm villalar), --rate 20
 * --commission-only: yalnızca komisyon oranını günceller (ön ödeme oranına dokunmaz)
 * --prepayment-only: yalnızca ön ödeme oranını günceller (komisyon oranına dokunmaz)
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_RATE = 20;

type Args = {
  dryRun: boolean;
  names: string[];
  prefix: string | null;
  commissionOnly: boolean;
  prepaymentOnly: boolean;
  rate: number;
};

function parseRate(argv: string[]): number {
  const rateIdx = argv.indexOf("--rate");
  if (rateIdx < 0) return DEFAULT_RATE;
  const raw = argv[rateIdx + 1];
  if (!raw) throw new Error("--rate için değer gerekli");
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error("Geçersiz oran: 1-100 arası tam sayı olmalı");
  }
  return Math.round(value);
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const commissionOnly = argv.includes("--commission-only");
  const prepaymentOnly = argv.includes("--prepayment-only");
  const rate = parseRate(argv);
  if (commissionOnly && prepaymentOnly) {
    throw new Error("--commission-only ve --prepayment-only birlikte kullanılamaz");
  }
  const namesFileIdx = argv.indexOf("--names-file");
  const excelIdx = argv.indexOf("--excel");
  const prefixIdx = argv.indexOf("--prefix");

  let names: string[] = [];
  let prefix: string | null = "Villa";

  if (namesFileIdx >= 0) {
    const path = argv[namesFileIdx + 1];
    if (!path) throw new Error("--names-file için dosya yolu gerekli");
    names = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    prefix = null;
  } else if (excelIdx >= 0) {
    const path = argv[excelIdx + 1];
    if (!path) throw new Error("--excel için dosya yolu gerekli");
    names = loadVillaNamesFromExcel(path);
    prefix = null;
  } else if (prefixIdx >= 0) {
    prefix = argv[prefixIdx + 1] ?? "Villa";
  }

  return { dryRun, names, prefix, commissionOnly, prepaymentOnly, rate };
}

function loadVillaNamesFromExcel(filePath: string): string[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName =
    workbook.SheetNames.find((name) =>
      name.toLocaleLowerCase("tr-TR").includes("villa listesi")
    ) ?? "Villa Listesi";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Excel sayfası bulunamadı: ${sheetName}`);

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  return rows
    .slice(2)
    .map((row) => String(row[1] ?? "").trim())
    .filter(Boolean);
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

async function resolveVillas(args: Args) {
  if (args.names.length > 0) {
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

    for (const rawName of args.names) {
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

  if (!args.prefix) {
    throw new Error("Villa listesi veya prefix belirtilmedi");
  }

  const villas = await prisma.villa.findMany({
    where: {
      name: { startsWith: args.prefix, mode: "insensitive" },
    },
    select: { id: true, name: true, originalName: true },
    orderBy: { name: "asc" },
  });

  return { villas, missing: [] as string[] };
}

async function main() {
  const args = parseArgs();
  const { villas, missing } = await resolveVillas(args);

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
  const rate = args.rate;
  if (args.commissionOnly) {
    console.log("Hedef: commissionRate=%d (ön ödeme oranı değişmeyecek)", rate);
  } else if (args.prepaymentOnly) {
    console.log("Hedef: prepaymentRate=%d (komisyon oranı değişmeyecek)", rate);
  } else {
    console.log("Hedef oranlar: prepaymentRate=%d, commissionRate=%d", rate, rate);
  }
  console.log("Mod:", args.dryRun ? "DRY-RUN" : "UYGULA");

  for (const villa of villas) {
    console.log(" -", villa.name);
  }

  if (args.dryRun) {
    console.log("Dry-run tamamlandı; veritabanı değiştirilmedi.");
    return;
  }

  const periodData = args.commissionOnly
    ? { commissionRate: rate }
    : args.prepaymentOnly
      ? { prepaymentRate: rate }
      : { prepaymentRate: rate, commissionRate: rate };
  const dayData = args.commissionOnly
    ? { commissionRate: rate }
    : args.prepaymentOnly
      ? { prepaymentRate: rate }
      : { prepaymentRate: rate, commissionRate: rate };

  const periodResult = await prisma.villaPricePeriod.updateMany({
    where: { villaId: { in: villaIds } },
    data: periodData,
  });

  const dayResult = await prisma.villaPricePeriodDay.updateMany({
    where: { villaId: { in: villaIds } },
    data: dayData,
  });

  let periodWithoutCommission = 0;
  let dayWithoutCommission = 0;
  if (!args.prepaymentOnly) {
    [periodWithoutCommission, dayWithoutCommission] = await Promise.all([
      prisma.$executeRaw`
        UPDATE "VillaPricePeriod"
        SET "nightlyPriceWithoutCommission" = ROUND("nightlyPrice" - ("nightlyPrice" * ${rate} / 100.0))
        WHERE "villaId" IN (${Prisma.join(villaIds)})
      `,
      prisma.$executeRaw`
        UPDATE "VillaPricePeriodDay"
        SET "nightlyPriceWithoutCommission" = ROUND("nightlyPrice" - ("nightlyPrice" * ${rate} / 100.0))
        WHERE "villaId" IN (${Prisma.join(villaIds)})
      `,
    ]);
  }

  if (args.prepaymentOnly) {
    console.log(
      "Güncellendi: %d periyot, %d gün kaydı",
      periodResult.count,
      dayResult.count
    );
    return;
  }

  console.log(
    "Güncellendi: %d periyot, %d gün kaydı (komisyonsuz fiyat yeniden hesaplandı: %d + %d satır)",
    periodResult.count,
    dayResult.count,
    periodWithoutCommission,
    dayWithoutCommission
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
