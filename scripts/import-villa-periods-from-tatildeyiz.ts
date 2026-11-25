import { readFile, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient, type VillaDayOccupancy } from "@prisma/client";
import {
  buildDaySnapshotsForPeriod,
  buildOccupancyByDateKey,
  mapTatildeyizPropertyPeriods,
  mappedPeriodToPeriodData,
} from "../lib/tatildeyiz-period-import";
import { fetchTatildeyizPropertyWithDelay } from "../lib/tatildeyiz-property";
import { dateKeyToDbDate, toDateKey } from "../lib/villa-period-calendar";

const PILOT_SLUGS = [
  "villa-olive",
  "villa-bella-doger",
  "villa-sur",
  "villa-ayda",
  "villa-sento",
] as const;

const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-villa-periods-report.json"
);

const prisma = new PrismaClient();

type VillaResult = {
  slug: string;
  villaId?: string;
  dbVillaId?: number | null;
  name?: string;
  status: "success" | "skipped" | "error";
  periodCount?: number;
  dayCount?: number;
  bookedDays?: number;
  optionDays?: number;
  error?: string;
};

type ImportOptions = {
  dryRun: boolean;
  force: boolean;
  resume: boolean;
  all: boolean;
  offset: number;
  batch: number;
  slug?: string;
};

function parseArgs(): ImportOptions {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const resume = process.argv.includes("--resume");
  const all = process.argv.includes("--all");
  const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
  const slug = slugArg?.split("=")[1]?.trim() || undefined;
  const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));
  const batchArg = process.argv.find((arg) => arg.startsWith("--batch="));

  const offset = offsetArg
    ? Math.max(0, parseInt(offsetArg.split("=")[1] ?? "", 10) || 0)
    : 0;

  const batch = batchArg
    ? Math.max(0, parseInt(batchArg.split("=")[1] ?? "", 10) || 0)
    : 0;

  return { dryRun, force, resume, all, offset, batch, slug };
}

async function loadPreviousReport(): Promise<VillaResult[]> {
  try {
    const raw = await readFile(REPORT_PATH, "utf8");
    const report = JSON.parse(raw) as { results?: VillaResult[] };
    return report.results ?? [];
  } catch {
    return [];
  }
}

async function loadResumeSlugs(): Promise<Set<string>> {
  const previous = await loadPreviousReport();
  return new Set(
    previous
      .filter((item) => item.status === "success" || item.status === "skipped")
      .map((item) => item.slug)
  );
}

async function resolveTargetSlugs(options: ImportOptions): Promise<string[]> {
  if (options.slug) return [options.slug];
  if (!options.all) return [...PILOT_SLUGS];

  const villas = await prisma.villa.findMany({
    select: { slug: true },
    orderBy: [{ villaId: "asc" }, { name: "asc" }],
    skip: options.offset,
    ...(options.batch > 0 ? { take: options.batch } : {}),
  });

  return villas.map((villa) => villa.slug);
}

function countOccupancyDays(
  periods: ReturnType<typeof mapTatildeyizPropertyPeriods>,
  occupancyByDateKey: Map<string, VillaDayOccupancy>
) {
  let dayCount = 0;
  let bookedDays = 0;
  let optionDays = 0;

  for (const period of periods) {
    const snapshots = buildDaySnapshotsForPeriod(period, occupancyByDateKey);
    dayCount += snapshots.length;

    for (const item of snapshots) {
      if (item.snapshot.occupancyStatus === "BOOKED") bookedDays += 1;
      if (item.snapshot.occupancyStatus === "OPTION") optionDays += 1;
    }
  }

  return { dayCount, bookedDays, optionDays };
}

async function importVillaPeriods(
  slug: string,
  options: Pick<ImportOptions, "dryRun" | "force">
): Promise<VillaResult> {
  const { dryRun, force } = options;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: { id: true, villaId: true, name: true, slug: true },
  });

  if (!villa) {
    return { slug, status: "error", error: "Villa veritabanında bulunamadı" };
  }

  const existingPeriodCount = await prisma.villaPricePeriod.count({
    where: { villaId: villa.id },
  });

  if (!force && existingPeriodCount > 0) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "skipped",
      error: `${existingPeriodCount} periyot zaten var (--force ile yeniden yazılabilir)`,
    };
  }

  const property = await fetchTatildeyizPropertyWithDelay(slug);
  const periods = mapTatildeyizPropertyPeriods(property);
  const occupancyByDateKey = buildOccupancyByDateKey(property);
  const { dayCount, bookedDays, optionDays } = countOccupancyDays(
    periods,
    occupancyByDateKey
  );

  if (periods.length === 0) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "error",
      error: "Tatildeyiz'den periyot bulunamadı",
    };
  }

  if (dryRun) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "success",
      periodCount: periods.length,
      dayCount,
      bookedDays,
      optionDays,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.villaPricePeriodDay.deleteMany({ where: { villaId: villa.id } });
    await tx.villaPricePeriod.deleteMany({ where: { villaId: villa.id } });

    for (const mapped of periods) {
      const periodData = mappedPeriodToPeriodData(mapped);
      const created = await tx.villaPricePeriod.create({
        data: {
          villaId: villa.id,
          ...periodData,
          startDate: dateKeyToDbDate(toDateKey(mapped.startDate)),
          endDate: dateKeyToDbDate(toDateKey(mapped.endDate)),
        },
      });

      const snapshots = buildDaySnapshotsForPeriod(mapped, occupancyByDateKey);
      if (snapshots.length === 0) continue;

      await tx.villaPricePeriodDay.createMany({
        data: snapshots.map(({ dateKey, snapshot }) => ({
          periodId: created.id,
          villaId: villa.id,
          date: dateKeyToDbDate(dateKey),
          ...snapshot,
          occupancyStatus: snapshot.occupancyStatus ?? "EMPTY",
        })),
        skipDuplicates: true,
      });
    }
  });

  return {
    slug,
    villaId: villa.id,
    dbVillaId: villa.villaId,
    name: villa.name,
    status: "success",
    periodCount: periods.length,
    dayCount,
    bookedDays,
    optionDays,
  };
}

async function main() {
  const options = parseArgs();
  const startedAt = new Date().toISOString();
  const results: VillaResult[] = [];

  let slugs = await resolveTargetSlugs(options);

  if (options.resume && !options.force) {
    const completed = await loadResumeSlugs();
    const before = slugs.length;
    slugs = slugs.filter((slug) => !completed.has(slug));
    console.log(
      `Resume: ${before - slugs.length} villa atlandı, ${slugs.length} villa kaldı`
    );
  }

  console.log(
    `Tatildeyiz periyot import başlıyor (${slugs.length} villa, dryRun=${options.dryRun}, force=${options.force})`
  );

  for (let index = 0; index < slugs.length; index += 1) {
    const slug = slugs[index];
    const progress = `[${index + 1}/${slugs.length}]`;

    try {
      const result = await importVillaPeriods(slug, options);
      results.push(result);
      console.log(
        `${progress} [${result.status}] ${slug}` +
          (result.periodCount != null ? ` → ${result.periodCount} periyot` : "") +
          (result.dayCount != null ? `, ${result.dayCount} gün` : "") +
          (result.bookedDays != null
            ? ` (${result.bookedDays} dolu, ${result.optionDays ?? 0} opsiyon)`
            : "") +
          (result.error ? ` (${result.error})` : "")
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      results.push({ slug, status: "error", error: message });
      console.error(`${progress} [error] ${slug}: ${message}`);
    }
  }

  const previousResults = options.resume ? await loadPreviousReport() : [];
  const resultMap = new Map(previousResults.map((item) => [item.slug, item]));
  for (const result of results) {
    resultMap.set(result.slug, result);
  }
  const mergedResults = Array.from(resultMap.values());

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    options,
    summary: {
      success: mergedResults.filter((item) => item.status === "success").length,
      skipped: mergedResults.filter((item) => item.status === "skipped").length,
      error: mergedResults.filter((item) => item.status === "error").length,
      totalPeriods: mergedResults.reduce(
        (sum, item) => sum + (item.periodCount ?? 0),
        0
      ),
      totalDays: mergedResults.reduce(
        (sum, item) => sum + (item.dayCount ?? 0),
        0
      ),
    },
    results: mergedResults,
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`Rapor yazıldı: ${REPORT_PATH}`);
  console.log(
    `Özet: ${report.summary.success} başarılı, ${report.summary.skipped} atlandı, ${report.summary.error} hata`
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
