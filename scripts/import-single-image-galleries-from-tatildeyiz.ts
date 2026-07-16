/**
 * Galerisinde yalnızca 1 resim olan (genelde Unsplash placeholder) villaları bulur;
 * Tatildeyiz kaynaklı olanları force=true ile tam galeriye günceller.
 *
 *   npx tsx scripts/import-single-image-galleries-from-tatildeyiz.ts
 *   npx tsx scripts/import-single-image-galleries-from-tatildeyiz.ts --dry-run
 *   npx tsx scripts/import-single-image-galleries-from-tatildeyiz.ts --limit=5
 *   npx tsx scripts/import-single-image-galleries-from-tatildeyiz.ts --resume
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import { importVillaGalleryFromTatildeyiz } from "../lib/tatildeyiz-gallery-import-runner";

const SITE_NAME = "Tatildeyiz";
/** Villa arası ekstra bekleme (runner içindeki delay'e ek). */
const BETWEEN_VILLAS_MS = 500;
const REQUEST_DELAY_MS = 350;
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-single-image-galleries-report.json"
);

type Row = {
  id: string;
  slug: string;
  villaId: number | null;
  name: string;
  imageCount: number;
};

type ResultStatus = "success" | "skipped" | "error";

type Result = {
  id: string;
  slug: string;
  villaId: number | null;
  name: string;
  status: ResultStatus;
  reason?: "unlinked" | "source_missing" | "other";
  importedCount?: number;
  sourceUrlCount?: number;
  error?: string;
};

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const resume = process.argv.includes("--resume");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="));
  const limit = limitArg
    ? Math.max(1, parseInt(limitArg.split("=")[1] ?? "", 10) || 0)
    : 0;
  const reportPath = reportArg
    ? path.resolve(process.cwd(), reportArg.split("=")[1] ?? REPORT_PATH)
    : REPORT_PATH;
  return { dryRun, resume, limit, reportPath };
}

async function findSingleImageVillas(): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT
      id,
      slug,
      "villaId",
      name,
      cardinality(images)::int AS "imageCount"
    FROM "Villa"
    WHERE cardinality(images) = 1
    ORDER BY slug ASC
  `;
}

function isLinked(row: Row): boolean {
  return row.villaId != null && Boolean(row.slug?.trim());
}

function isSourceMissingMessage(message: string): boolean {
  return (
    /Tatildeyiz kaynak sayfası bulunamadı/i.test(message) ||
    /Sayfa alınamadı \(404\)/i.test(message) ||
    /Tesis verisi bulunamadı/i.test(message) ||
    /propertyImages boş/i.test(message) ||
    /__NEXT_DATA__ bulunamadı/i.test(message)
  );
}

async function loadPreviousResults(reportPath: string): Promise<Result[]> {
  try {
    const raw = await readFile(reportPath, "utf8");
    const report = JSON.parse(raw) as {
      options?: { dryRun?: boolean };
      results?: Result[];
    };
    // Dry-run sonuçlarını gerçek importta başarı sayma
    if (report.options?.dryRun) {
      return (report.results ?? []).filter((r) => r.status === "skipped");
    }
    return report.results ?? [];
  } catch {
    return [];
  }
}

async function saveReport(options: {
  dryRun: boolean;
  reportPath: string;
  totalSingleImage: number;
  results: Result[];
}) {
  const success = options.results.filter((r) => r.status === "success").length;
  const skipped = options.results.filter((r) => r.status === "skipped").length;
  const errors = options.results.filter((r) => r.status === "error").length;

  const payload = {
    updatedAt: new Date().toISOString(),
    options: { dryRun: options.dryRun },
    summary: {
      totalSingleImage: options.totalSingleImage,
      processed: options.results.length,
      success,
      skipped,
      errors,
      skippedUnlinked: options.results.filter((r) => r.reason === "unlinked")
        .length,
      skippedSourceMissing: options.results.filter(
        (r) => r.reason === "source_missing"
      ).length,
    },
    results: options.results,
  };

  await mkdir(path.dirname(options.reportPath), { recursive: true });
  await writeFile(options.reportPath, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const { dryRun, resume, limit, reportPath } = parseArgs();
  const all = await findSingleImageVillas();

  const previous = resume ? await loadPreviousResults(reportPath) : [];
  const doneSlugs = new Set(
    previous
      .filter((r) => r.status === "success" || r.status === "skipped")
      .map((r) => r.slug)
  );

  let pending = all.filter((row) => !doneSlugs.has(row.slug));
  if (limit > 0) {
    pending = pending.slice(0, limit);
  }

  const linked = pending.filter(isLinked);
  const unlinked = pending.filter((r) => !isLinked(r));

  console.log("=== Tek resimli villa galeri import ===");
  console.log(
    JSON.stringify(
      {
        dryRun,
        resume,
        reportPath,
        limit: limit || "all",
        totalSingleImage: all.length,
        alreadyDone: doneSlugs.size,
        processing: pending.length,
        linked: linked.length,
        unlinked: unlinked.length,
      },
      null,
      2
    )
  );

  const results: Result[] = [...previous];

  for (const row of unlinked) {
    const result: Result = {
      id: row.id,
      slug: row.slug,
      villaId: row.villaId,
      name: row.name,
      status: "skipped",
      reason: "unlinked",
      error: "Tatildeyiz bağlantısı yok (villaId veya slug eksik)",
    };
    results.push(result);
    console.log(
      `[SKIP/unlinked] ${row.slug || row.id} — ${result.error} (name=${row.name})`
    );
  }

  await saveReport({
    dryRun,
    reportPath,
    totalSingleImage: all.length,
    results,
  });

  for (let i = 0; i < linked.length; i += 1) {
    const row = linked[i]!;
    const progress = `[${i + 1}/${linked.length}]`;
    console.log(
      `${progress} IMPORT ${row.slug} (villaId=${row.villaId}, name=${row.name})`
    );

    try {
      const gallery = await importVillaGalleryFromTatildeyiz(row.id, {
        siteName: SITE_NAME,
        force: true,
        dryRun,
        delayMs: REQUEST_DELAY_MS,
      });
      results.push({
        id: row.id,
        slug: row.slug,
        villaId: row.villaId,
        name: row.name,
        status: "success",
        importedCount: gallery.importedCount,
        sourceUrlCount: gallery.sourceUrlCount,
      });
      console.log(
        `${progress} OK ${row.slug} — ${gallery.importedCount}/${gallery.sourceUrlCount} görsel`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      if (isSourceMissingMessage(message)) {
        results.push({
          id: row.id,
          slug: row.slug,
          villaId: row.villaId,
          name: row.name,
          status: "skipped",
          reason: "source_missing",
          error: message,
        });
        console.log(`${progress} SKIP/source_missing ${row.slug} — ${message}`);
      } else {
        results.push({
          id: row.id,
          slug: row.slug,
          villaId: row.villaId,
          name: row.name,
          status: "error",
          reason: "other",
          error: message,
        });
        console.log(`${progress} ERR ${row.slug} — ${message}`);
      }
    }

    // Her villa sonrası kaydet — kesinti sonrası --resume güvenilir olsun
    await saveReport({
      dryRun,
      reportPath,
      totalSingleImage: all.length,
      results,
    });

    if ((i + 1) % 10 === 0 || i === linked.length - 1) {
      const success = results.filter((r) => r.status === "success").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      const errors = results.filter((r) => r.status === "error").length;
      console.log(
        `--- checkpoint: success=${success} skipped=${skipped} errors=${errors} ---`
      );
    }

    if (i < linked.length - 1) {
      await sleep(BETWEEN_VILLAS_MS);
    }
  }

  await saveReport({
    dryRun,
    reportPath,
    totalSingleImage: all.length,
    results,
  });

  const success = results.filter((r) => r.status === "success").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;
  const skippedUnlinked = results.filter((r) => r.reason === "unlinked");
  const skippedSourceMissing = results.filter(
    (r) => r.reason === "source_missing"
  );

  console.log("\n=== ÖZET ===");
  console.log(
    JSON.stringify(
      {
        dryRun,
        reportPath,
        totalSingleImage: all.length,
        processed: results.length,
        success,
        skipped,
        errors,
        skippedUnlinkedCount: skippedUnlinked.length,
        skippedSourceMissingCount: skippedSourceMissing.length,
        skippedUnlinked: skippedUnlinked.map((r) => ({
          slug: r.slug,
          villaId: r.villaId,
          name: r.name,
        })),
        errorDetails: results
          .filter((r) => r.status === "error")
          .map((r) => ({ slug: r.slug, villaId: r.villaId, error: r.error })),
      },
      null,
      2
    )
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
