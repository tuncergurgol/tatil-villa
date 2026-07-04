import { writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
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
  "import-villa-periods-pilot-report.json"
);

const prisma = new PrismaClient();

type VillaResult = {
  slug: string;
  villaId?: string;
  name?: string;
  status: "success" | "skipped" | "error";
  periodCount?: number;
  dayCount?: number;
  bookedDays?: number;
  optionDays?: number;
  error?: string;
};

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
  const slug = slugArg?.split("=")[1]?.trim();
  return { dryRun, force, slug };
}

function countOccupancyDays(
  periods: ReturnType<typeof mapTatildeyizPropertyPeriods>,
  occupancyByDateKey: Map<string, "EMPTY" | "BOOKED" | "OPTION">
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

async function importVillaPeriods(options: {
  slug: string;
  dryRun: boolean;
  force: boolean;
}): Promise<VillaResult> {
  const { slug, dryRun, force } = options;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
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
      name: villa.name,
      status: "error",
      error: "Tatildeyiz'den periyot bulunamadı",
    };
  }

  if (dryRun) {
    return {
      slug,
      villaId: villa.id,
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
      });
    }
  });

  return {
    slug,
    villaId: villa.id,
    name: villa.name,
    status: "success",
    periodCount: periods.length,
    dayCount,
    bookedDays,
    optionDays,
  };
}

async function main() {
  const { dryRun, force, slug } = parseArgs();
  const slugs = slug ? [slug] : [...PILOT_SLUGS];
  const startedAt = new Date().toISOString();
  const results: VillaResult[] = [];

  console.log(
    `Pilot periyot import başlıyor (${slugs.length} villa, dryRun=${dryRun}, force=${force})`
  );

  for (const itemSlug of slugs) {
    try {
      const result = await importVillaPeriods({ slug: itemSlug, dryRun, force });
      results.push(result);
      console.log(
        `[${result.status}] ${itemSlug}` +
          (result.periodCount != null ? ` → ${result.periodCount} periyot` : "") +
          (result.dayCount != null ? `, ${result.dayCount} gün` : "") +
          (result.bookedDays != null ? ` (${result.bookedDays} dolu` : "") +
          (result.optionDays != null ? `, ${result.optionDays} opsiyon)` : "") +
          (result.error ? ` (${result.error})` : "")
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      results.push({ slug: itemSlug, status: "error", error: message });
      console.error(`[error] ${itemSlug}: ${message}`);
    }
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun,
    force,
    slugs,
    summary: {
      success: results.filter((item) => item.status === "success").length,
      skipped: results.filter((item) => item.status === "skipped").length,
      error: results.filter((item) => item.status === "error").length,
      totalPeriods: results.reduce(
        (sum, item) => sum + (item.periodCount ?? 0),
        0
      ),
      totalDays: results.reduce((sum, item) => sum + (item.dayCount ?? 0), 0),
    },
    results,
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`Rapor yazıldı: ${REPORT_PATH}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
