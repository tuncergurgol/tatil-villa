import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { processGalleryImageToWebp } from "../lib/process-gallery-image";
import {
  fetchTatildeyizGalleryUrls,
  sleep,
} from "../lib/tatildeyiz-gallery";
import { buildSeoGalleryFileName } from "../lib/villa-gallery-filename";

const PILOT_SLUGS = [
  "villa-olive",
  "villa-bella-doger",
  "villa-sur",
  "villa-ayda",
  "villa-sento",
] as const;

const SITE_NAME = "Tatildeyiz";
const DEFAULT_PILOT_LIMIT = 20;
const REQUEST_DELAY_MS = 300;
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-villa-images-report.json"
);

const prisma = new PrismaClient();

type VillaResult = {
  slug: string;
  villaId?: string;
  dbVillaId?: number | null;
  name?: string;
  status: "success" | "skipped" | "error";
  sourceUrlCount?: number;
  importedCount?: number;
  localUrls?: string[];
  error?: string;
};

type ImportOptions = {
  dryRun: boolean;
  force: boolean;
  limit: number;
  resume: boolean;
  offset: number;
  batch: number;
  all: boolean;
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
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));
  const batchArg = process.argv.find((arg) => arg.startsWith("--batch="));
  const fromIdArg = process.argv.find((arg) => arg.startsWith("--from-id="));
  const toIdArg = process.argv.find((arg) => arg.startsWith("--to-id="));
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="));

  let limit = all || fromIdArg || toIdArg ? 0 : DEFAULT_PILOT_LIMIT;
  if (limitArg) {
    const parsed = parseInt(limitArg.split("=")[1] ?? "", 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      limit = parsed;
    }
  }

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
    limit,
    resume,
    offset,
    batch,
    all: all || (fromId != null && toId != null),
    fromId: Number.isFinite(fromId) ? fromId : undefined,
    toId: Number.isFinite(toId) ? toId : undefined,
    slug,
    reportPath,
  };
}

function hasManagedGallery(image: string, images: string[]) {
  const all = [image, ...images].filter(Boolean);
  return all.some((url) => url.startsWith("/uploads/villas/"));
}

async function loadPreviousReport(reportPath: string): Promise<VillaResult[]> {
  try {
    const raw = await readFile(reportPath, "utf8");
    const report = JSON.parse(raw) as { results?: VillaResult[] };
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

async function downloadImage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TatilVillaImageImport/1.0)",
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Görsel indirilemedi (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
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

async function importVillaImages(
  slug: string,
  options: Pick<ImportOptions, "limit" | "dryRun" | "force">
): Promise<VillaResult> {
  const { limit, dryRun, force } = options;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      image: true,
      images: true,
    },
  });

  if (!villa) {
    return { slug, status: "error", error: "Villa veritabanında bulunamadı" };
  }

  if (!force && hasManagedGallery(villa.image, villa.images)) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "skipped",
      error: "Yerel galeri zaten mevcut (--force ile yeniden yazılabilir)",
    };
  }

  await sleep(REQUEST_DELAY_MS);
  const sourceUrls = await fetchTatildeyizGalleryUrls(slug);
  const selectedUrls =
    limit > 0 ? sourceUrls.slice(0, limit) : sourceUrls;

  if (selectedUrls.length === 0) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "error",
      sourceUrlCount: sourceUrls.length,
      error: "İndirilecek görsel bulunamadı",
    };
  }

  if (dryRun) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "success",
      sourceUrlCount: sourceUrls.length,
      importedCount: selectedUrls.length,
      localUrls: selectedUrls,
    };
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "villas",
    villa.id
  );
  if (force) {
    await rm(uploadDir, { recursive: true, force: true });
  }
  await mkdir(uploadDir, { recursive: true });

  const localUrls: string[] = [];

  for (let index = 0; index < selectedUrls.length; index += 1) {
    const sourceUrl = selectedUrls[index];
    const sequence = index + 1;
    const fileName = buildSeoGalleryFileName(SITE_NAME, villa.name, sequence);
    const outputPath = path.join(uploadDir, fileName);

    await sleep(REQUEST_DELAY_MS);
    const sourceBuffer = await downloadImage(sourceUrl);
    const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
    await writeFile(outputPath, webpBuffer);

    localUrls.push(`/uploads/villas/${villa.id}/${fileName}`);
  }

  await prisma.villa.update({
    where: { id: villa.id },
    data: {
      image: localUrls[0] ?? "",
      images: localUrls,
    },
  });

  return {
    slug,
    villaId: villa.id,
    dbVillaId: villa.villaId,
    name: villa.name,
    status: "success",
    sourceUrlCount: sourceUrls.length,
    importedCount: localUrls.length,
    localUrls,
  };
}

async function main() {
  const options = parseArgs();
  const startedAt = new Date().toISOString();
  const results: VillaResult[] = [];

  let slugs = await resolveTargetSlugs(options);

  if (options.resume && !options.force) {
    const completed = await loadResumeSlugs(options.reportPath);
    const before = slugs.length;
    slugs = slugs.filter((slug) => !completed.has(slug));
    console.log(
      `Resume: ${before - slugs.length} villa atlandı, ${slugs.length} villa kaldı`
    );
  }

  console.log(
    `Tatildeyiz görsel import başlıyor (${slugs.length} villa, limit=${
      options.limit > 0 ? options.limit : "tümü"
    }, dryRun=${options.dryRun}, force=${options.force})`
  );

  for (let index = 0; index < slugs.length; index += 1) {
    const slug = slugs[index];
    const progress = `[${index + 1}/${slugs.length}]`;

    try {
      const result = await importVillaImages(slug, options);
      results.push(result);
      console.log(
        `${progress} [${result.status}] ${slug}` +
          (result.importedCount != null ? ` → ${result.importedCount} görsel` : "") +
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
      totalImported: mergedResults.reduce(
        (sum, item) => sum + (item.importedCount ?? 0),
        0
      ),
    },
    results: mergedResults,
  };

  await writeFile(options.reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Rapor yazıldı: ${options.reportPath}`);
  console.log(
    `Özet: ${report.summary.success} başarılı, ${report.summary.skipped} atlandı, ${report.summary.error} hata, ${report.summary.totalImported} görsel`
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
