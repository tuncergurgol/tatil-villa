import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../lib/db";

const BATCH_SIZE = 25;

type AddressRow = {
  slug: string;
  documentNo: string;
  address: string;
};

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const inputArg = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"));
  const inputPath = inputArg
    ? resolve(inputArg)
    : resolve(process.cwd(), "scripts/aylik-ilan-addresses.json");
  const reportPath = resolve(
    process.cwd(),
    "scripts/import-villa-document-addresses-report.json"
  );
  return { dryRun, inputPath, reportPath };
}

async function main() {
  const { dryRun, inputPath, reportPath } = parseArgs();
  if (!existsSync(inputPath)) {
    throw new Error(`JSON dosyasi bulunamadi: ${inputPath}`);
  }

  const rows = JSON.parse(readFileSync(inputPath, "utf8")) as AddressRow[];
  console.log(`Kaynak: ${inputPath}`);
  console.log(`Mod: ${dryRun ? "dry-run" : "import"}`);
  console.log(`Kayit: ${rows.length}`);

  let updated = 0;
  let skippedUnmatched = 0;
  let skippedUnchanged = 0;
  const sampleErrors: Array<{
    slug: string;
    documentNo: string;
    reason: string;
  }> = [];

  for (const row of rows) {
    const villa =
      (row.slug
        ? await prisma.villa.findUnique({
            where: { slug: row.slug },
            select: { id: true, documentAddress: true },
          })
        : null) ??
      (row.documentNo
        ? await prisma.villa.findFirst({
            where: { documentNo: row.documentNo },
            select: { id: true, documentAddress: true },
          })
        : null);

    if (!villa) {
      skippedUnmatched += 1;
      if (sampleErrors.length < 25) {
        sampleErrors.push({
          slug: row.slug,
          documentNo: row.documentNo,
          reason: "Villa eslesmedi",
        });
      }
      continue;
    }

    if (villa.documentAddress.trim() === row.address.trim()) {
      skippedUnchanged += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.villa.update({
        where: { id: villa.id },
        data: { documentAddress: row.address.trim() },
      });
    }
    updated += 1;

    if (updated % 50 === 0) {
      console.log(`Guncellenen: ${updated}`);
    }
  }

  const report = {
    inputPath,
    dryRun,
    stats: { updated, skippedUnmatched, skippedUnchanged },
    sampleErrors,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Guncellenen: ${updated}`);
  console.log(`Eslesmeyen: ${skippedUnmatched}`);
  console.log(`Zaten guncel: ${skippedUnchanged}`);
  console.log(`Rapor: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
