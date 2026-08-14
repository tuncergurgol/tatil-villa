import { mkdir, rm, writeFile } from "fs/promises";
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
const DEFAULT_LIMIT = 20;
const REQUEST_DELAY_MS = 300;
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-villa-images-pilot-report.json"
);

const prisma = new PrismaClient();

type VillaResult = {
  slug: string;
  villaId?: string;
  name?: string;
  status: "success" | "skipped" | "error";
  sourceUrlCount?: number;
  importedCount?: number;
  localUrls?: string[];
  error?: string;
};

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg
    ? Math.max(1, parseInt(limitArg.split("=")[1] ?? "", 10) || DEFAULT_LIMIT)
    : DEFAULT_LIMIT;

  return { dryRun, force, limit };
}

function hasManagedGallery(image: string, images: string[]) {
  const all = [image, ...images].filter(Boolean);
  return all.some((url) => url.startsWith("/uploads/villas/"));
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

async function importVillaImages(options: {
  slug: string;
  limit: number;
  dryRun: boolean;
  force: boolean;
}): Promise<VillaResult> {
  const { slug, limit, dryRun, force } = options;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, image: true, images: true },
  });

  if (!villa) {
    return { slug, status: "error", error: "Villa veritabanında bulunamadı" };
  }

  if (!force && hasManagedGallery(villa.image, villa.images)) {
    return {
      slug,
      villaId: villa.id,
      name: villa.name,
      status: "skipped",
      error: "Yerel galeri zaten mevcut (--force ile yeniden yazılabilir)",
    };
  }

  await sleep(REQUEST_DELAY_MS);
  const sourceUrls = await fetchTatildeyizGalleryUrls(slug);
  const selectedUrls = sourceUrls.slice(0, limit);

  if (selectedUrls.length === 0) {
    return {
      slug,
      villaId: villa.id,
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
      name: villa.name,
      status: "success",
      sourceUrlCount: sourceUrls.length,
      importedCount: selectedUrls.length,
      localUrls: selectedUrls,
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "villas", villa.id);
  if (force) {
    await rm(uploadDir, { recursive: true, force: true });
  }
  await mkdir(uploadDir, { recursive: true });

  const localUrls: string[] = [];

  for (let index = 0; index < selectedUrls.length; index += 1) {
    const sourceUrl = selectedUrls[index];
    const sequence = index + 1;
    const fileName = buildSeoGalleryFileName(villa.name, sequence);
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
    name: villa.name,
    status: "success",
    sourceUrlCount: sourceUrls.length,
    importedCount: localUrls.length,
    localUrls,
  };
}

async function main() {
  const { dryRun, force, limit } = parseArgs();
  const startedAt = new Date().toISOString();
  const results: VillaResult[] = [];

  console.log(
    `Pilot görsel import başlıyor (${PILOT_SLUGS.length} villa, limit=${limit}, dryRun=${dryRun}, force=${force})`
  );

  for (const slug of PILOT_SLUGS) {
    try {
      const result = await importVillaImages({ slug, limit, dryRun, force });
      results.push(result);
      console.log(
        `[${result.status}] ${slug}` +
          (result.importedCount != null ? ` → ${result.importedCount} görsel` : "") +
          (result.error ? ` (${result.error})` : "")
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      results.push({ slug, status: "error", error: message });
      console.error(`[error] ${slug}: ${message}`);
    }
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun,
    force,
    limit,
    slugs: [...PILOT_SLUGS],
    summary: {
      success: results.filter((item) => item.status === "success").length,
      skipped: results.filter((item) => item.status === "skipped").length,
      error: results.filter((item) => item.status === "error").length,
      totalImported: results.reduce(
        (sum, item) => sum + (item.importedCount ?? 0),
        0
      ),
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
