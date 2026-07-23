/**
 * Villa yorumlarını CSV'den GuestReview tablosuna aktarır.
 *
 * Örnek:
 *   npx tsx scripts/import-villa-reviews-from-csv.ts --dry-run "c:/Users/BARAN/Downloads/villa-yorumlar.csv"
 *   npx tsx scripts/import-villa-reviews-from-csv.ts "c:/Users/BARAN/Downloads/villa-yorumlar.csv"
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  buildReviewFingerprint,
  DEFAULT_VILLA_REVIEWS_CSV_PATH,
  formatStayMonth,
  readVillaReviewRowsFromCsv,
  type VillaReviewCsvRow,
} from "../lib/villa-reviews-csv-import";

const SOURCE = "csv:villa-yorumlar";

type ImportError = {
  row: number;
  legacyVillaId: number;
  villaName: string;
  guestName: string;
  reason: string;
};

type ImportSuccess = {
  row: number;
  legacyVillaId: number;
  villaName: string;
  guestName: string;
  villaDbId: string;
};

type ImportStats = {
  totalRows: number;
  skippedInvalid: number;
  imported: number;
  skippedDuplicate: number;
  villaNotFound: number;
  failed: number;
};

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const fileArg = argv.find((arg) => !arg.startsWith("--"));
  const reportArg = argv.find((arg) => arg.startsWith("--report="));
  const filePath = fileArg ?? DEFAULT_VILLA_REVIEWS_CSV_PATH;
  const reportPath = reportArg
    ? resolve(reportArg.slice("--report=".length))
    : resolve("scripts/import-villa-reviews-report.json");

  return { dryRun, filePath, reportPath };
}

function buildReviewData(
  row: VillaReviewCsvRow,
  villaDbId: string
) {
  const createdAt = row.reviewDate ?? new Date();
  return {
    guestName: row.guestName,
    guestCity: "",
    rating: row.rating ?? 5,
    title: row.title,
    comment: row.comment,
    villaId: villaDbId,
    stayMonth: formatStayMonth(row.reviewDate),
    source: SOURCE,
    approved: true,
    featured: false,
    sortOrder: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

async function main() {
  const { dryRun, filePath, reportPath } = parseArgs(process.argv.slice(2));

  if (!existsSync(filePath)) {
    throw new Error(`CSV dosyası bulunamadı: ${filePath}`);
  }

  console.log(`Kaynak: ${filePath}`);
  console.log(dryRun ? "Mod: dry-run" : "Mod: import");

  const parsed = readVillaReviewRowsFromCsv(filePath);
  console.log(`Geçerli satır: ${parsed.rows.length}`);
  if (parsed.skippedRows > 0) {
    console.log(`Atlanan boş/geçersiz satır: ${parsed.skippedRows}`);
  }

  const villas = await prisma.villa.findMany({
    where: { villaId: { not: null } },
    select: { id: true, villaId: true, name: true },
  });
  const villaByLegacyId = new Map(
    villas
      .filter((villa): villa is typeof villa & { villaId: number } => villa.villaId != null)
      .map((villa) => [villa.villaId, villa])
  );

  const existingReviews = await prisma.guestReview.findMany({
    where: { source: SOURCE },
    select: {
      villaId: true,
      guestName: true,
      comment: true,
      createdAt: true,
    },
  });
  const existingFingerprints = new Set(
    existingReviews
      .filter((review) => review.villaId)
      .map((review) =>
        buildReviewFingerprint({
          villaId: review.villaId!,
          guestName: review.guestName,
          comment: review.comment,
          createdAt: review.createdAt,
        })
      )
  );

  const stats: ImportStats = {
    totalRows: parsed.rows.length,
    skippedInvalid: parsed.skippedRows,
    imported: 0,
    skippedDuplicate: 0,
    villaNotFound: 0,
    failed: 0,
  };
  const errors: ImportError[] = [];
  const successes: ImportSuccess[] = [];

  for (const row of parsed.rows) {
    const villa = villaByLegacyId.get(row.legacyVillaId);
    if (!villa) {
      stats.villaNotFound += 1;
      errors.push({
        row: row.rowNumber,
        legacyVillaId: row.legacyVillaId,
        villaName: row.villaName,
        guestName: row.guestName,
        reason: "Villa bulunamadı (fldUrunID eşleşmedi)",
      });
      continue;
    }

    const data = buildReviewData(row, villa.id);
    const fingerprint = buildReviewFingerprint({
      villaId: villa.id,
      guestName: data.guestName,
      comment: data.comment,
      createdAt: data.createdAt,
    });

    if (existingFingerprints.has(fingerprint)) {
      stats.skippedDuplicate += 1;
      continue;
    }

    if (dryRun) {
      stats.imported += 1;
      successes.push({
        row: row.rowNumber,
        legacyVillaId: row.legacyVillaId,
        villaName: row.villaName || villa.name,
        guestName: row.guestName,
        villaDbId: villa.id,
      });
      existingFingerprints.add(fingerprint);
      continue;
    }

    try {
      await prisma.guestReview.create({ data });
      stats.imported += 1;
      successes.push({
        row: row.rowNumber,
        legacyVillaId: row.legacyVillaId,
        villaName: row.villaName || villa.name,
        guestName: row.guestName,
        villaDbId: villa.id,
      });
      existingFingerprints.add(fingerprint);
    } catch (error) {
      stats.failed += 1;
      errors.push({
        row: row.rowNumber,
        legacyVillaId: row.legacyVillaId,
        villaName: row.villaName,
        guestName: row.guestName,
        reason:
          error instanceof Error ? error.message : "Bilinmeyen veritabanı hatası",
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    filePath,
    stats,
    errors,
    successes: successes.slice(0, 50),
    errorSamples: errors.slice(0, 100),
    unmatchedVillaIds: [
      ...new Set(
        errors
          .filter((item) => item.reason.includes("fldUrunID"))
          .map((item) => item.legacyVillaId)
      ),
    ].sort((a, b) => a - b),
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== Özet ===");
  console.log(`Toplam geçerli satır: ${stats.totalRows}`);
  console.log(`İçe aktarılan: ${stats.imported}`);
  console.log(`Tekrar (atlandı): ${stats.skippedDuplicate}`);
  console.log(`Villa bulunamadı: ${stats.villaNotFound}`);
  console.log(`Başarısız: ${stats.failed}`);
  console.log(`Rapor: ${reportPath}`);

  if (errors.length > 0) {
    console.log("\n=== Hatalı kayıtlar (ilk 10) ===");
    for (const item of errors.slice(0, 10)) {
      console.log(
        `- Satır ${item.row} | Villa ${item.legacyVillaId} (${item.villaName}) | ${item.guestName}: ${item.reason}`
      );
    }
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
