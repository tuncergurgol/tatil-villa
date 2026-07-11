import { readFile, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  applyTatildeyizLocationToVilla,
  createSharedLocationCache,
  type ImportVillaLocationResult,
} from "../lib/tatildeyiz-location-import";

const PILOT_SLUGS = [
  "villa-manzara",
  "villa-olive",
  "villa-bella-doger",
  "villa-sur",
  "villa-sento",
] as const;

const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-villa-locations-report.json"
);

const prisma = new PrismaClient();

type ImportOptions = {
  dryRun: boolean;
  force: boolean;
  resume: boolean;
  all: boolean;
  offset: number;
  batch: number;
  fromId?: number;
  toId?: number;
  slug?: string;
  reportPath: string;
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
  const fromIdArg = process.argv.find((arg) => arg.startsWith("--from-id="));
  const toIdArg = process.argv.find((arg) => arg.startsWith("--to-id="));
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="));

  const offset = offsetArg
    ? Math.max(0, parseInt(offsetArg.split("=")[1] ?? "", 10) || 0)
    : 0;

  const batch = batchArg
    ? Math.max(0, parseInt(batchArg.split("=")[1] ?? "", 10) || 0)
    : 0;

  const fromId = fromIdArg
    ? parseInt(fromIdArg.split("=")[1] ?? "", 10)
    : undefined;
  const toId = toIdArg ? parseInt(toIdArg.split("=")[1] ?? "", 10) : undefined;

  const reportPath = reportArg
    ? path.resolve(process.cwd(), reportArg.split("=")[1] ?? REPORT_PATH)
    : REPORT_PATH;

  return {
    dryRun,
    force,
    resume,
    all: all || (fromId != null && toId != null),
    offset,
    batch,
    fromId: Number.isFinite(fromId) ? fromId : undefined,
    toId: Number.isFinite(toId) ? toId : undefined,
    slug,
    reportPath,
  };
}

async function loadPreviousReport(
  reportPath: string
): Promise<ImportVillaLocationResult[]> {
  try {
    const raw = await readFile(reportPath, "utf8");
    const report = JSON.parse(raw) as {
      results?: ImportVillaLocationResult[];
    };
    return report.results ?? [];
  } catch {
    return [];
  }
}

async function loadResumeSlugs(reportPath: string): Promise<Set<string>> {
  let wasDryRun = false;
  try {
    const raw = await readFile(reportPath, "utf8");
    const report = JSON.parse(raw) as { options?: { dryRun?: boolean } };
    wasDryRun = report.options?.dryRun === true;
  } catch {
    // ignore
  }

  const previous = await loadPreviousReport(reportPath);
  return new Set(
    previous
      .filter((item) => {
        if (item.status === "skipped") return true;
        if (item.status === "success" && !wasDryRun) return true;
        return false;
      })
      .map((item) => item.slug)
  );
}

async function resolveTargetSlugs(options: ImportOptions): Promise<string[]> {
  if (options.slug) {
    return [options.slug];
  }

  if (options.fromId != null && options.toId != null) {
    const villas = await prisma.villa.findMany({
      where: {
        villaId: {
          gte: options.fromId,
          lte: options.toId,
          not: null,
        },
      },
      select: { slug: true },
      orderBy: { villaId: "asc" },
    });
    return villas.map((villa) => villa.slug);
  }

  if (!options.all) {
    return [...PILOT_SLUGS];
  }

  const villas = await prisma.villa.findMany({
    select: { slug: true },
    orderBy: [{ villaId: "asc" }, { name: "asc" }],
    skip: options.offset,
    ...(options.batch > 0 ? { take: options.batch } : {}),
  });

  return villas.map((villa) => villa.slug);
}

async function main() {
  const options = parseArgs();
  const startedAt = new Date().toISOString();
  const results: ImportVillaLocationResult[] = [];
  const cache = await createSharedLocationCache(prisma);

  let slugs = await resolveTargetSlugs(options);

  if (options.resume) {
    const completed = await loadResumeSlugs(options.reportPath);
    const before = slugs.length;
    slugs = slugs.filter((slug) => !completed.has(slug));
    console.log(
      `Resume: ${before - slugs.length} villa atlandı, ${slugs.length} villa kaldı`
    );
  }

  console.log(
    `Tatildeyiz konum/mesafe import başlıyor (${slugs.length} villa, dryRun=${options.dryRun}, force=${options.force})`
  );

  for (let index = 0; index < slugs.length; index += 1) {
    const slug = slugs[index];
    const progress = `[${index + 1}/${slugs.length}]`;

    try {
      const result = await applyTatildeyizLocationToVilla(prisma, slug, {
        dryRun: options.dryRun,
        force: options.force,
        cache,
      });
      results.push(result);
      console.log(
        `${progress} [${result.status}] ${slug}` +
          (result.latitude != null && result.longitude != null
            ? ` → ${result.latitude},${result.longitude}`
            : "") +
          (result.distanceCount != null
            ? ` / ${result.distanceCount} mesafe`
            : "") +
          (result.locationLabel ? ` / ${result.locationLabel}` : "") +
          (result.error ? ` (${result.error})` : "")
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      results.push({ slug, status: "error", error: message });
      console.error(`${progress} [error] ${slug}: ${message}`);
    }
  }

  const previousResults = options.resume
    ? await loadPreviousReport(options.reportPath)
    : [];
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
      totalDistances: mergedResults.reduce(
        (sum, item) => sum + (item.distanceCount ?? 0),
        0
      ),
      createdLocations: mergedResults.reduce(
        (sum, item) => sum + (item.createdLocations ?? 0),
        0
      ),
      createdCategories: mergedResults.reduce(
        (sum, item) => sum + (item.createdCategories ?? 0),
        0
      ),
    },
    results: mergedResults,
  };

  await writeFile(options.reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Rapor yazıldı: ${options.reportPath}`);
  console.log(
    `Özet: ${report.summary.success} başarılı, ${report.summary.skipped} atlandı, ${report.summary.error} hata, ${report.summary.totalDistances} mesafe, +${report.summary.createdLocations} konum tipi`
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
