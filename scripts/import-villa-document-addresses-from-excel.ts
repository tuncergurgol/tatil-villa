import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";

const DEFAULT_FILE_PATH = resolve(
  process.cwd(),
  "scripts/aylik-ilan-raporu-7464-2026-06.xlsx"
);
const BATCH_SIZE = 50;

type ImportRow = {
  rowNumber: number;
  slug: string;
  documentNo: string;
  address: string;
};

type ImportError = {
  rowNumber: number;
  slug: string;
  documentNo: string;
  reason: string;
};

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.find((arg) => !arg.startsWith("--"));
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="));
  const filePath = fileArg ?? DEFAULT_FILE_PATH;
  const reportPath = reportArg
    ? resolve(reportArg.slice("--report=".length))
    : resolve("scripts/import-villa-document-addresses-report.json");

  return { dryRun, filePath, reportPath };
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumnIndex(headers: unknown[], matchers: string[]) {
  return headers.findIndex((header) => {
    const text = normalizeHeader(header);
    return matchers.every((matcher) => text.includes(matcher));
  });
}

function extractSlugFromListingUrl(url: string) {
  const trimmed = url.trim().replace(/^https?:\/\//i, "");
  const parts = trimmed.split("/").filter(Boolean);
  return (parts[parts.length - 1] ?? "").trim();
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

async function readImportRows(filePath: string): Promise<ImportRow[]> {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) {
    throw new Error("Excel sayfası bulunamadı.");
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  const headers = matrix[0] ?? [];
  const linkIndex = findColumnIndex(headers, ["ilan", "link"]);
  const addressIndex = findColumnIndex(headers, ["ilan", "adres"]);
  const documentNoIndex = findColumnIndex(headers, ["belge", "numara"]);

  if (linkIndex === -1 || addressIndex === -1) {
    throw new Error("Excel başlıkları okunamadı (İlan Linki / İlan Adresi).");
  }

  const rows: ImportRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const cells = matrix[index] ?? [];
    const slug = extractSlugFromListingUrl(cleanText(cells[linkIndex]));
    const address = cleanText(cells[addressIndex]);
    const documentNo =
      documentNoIndex >= 0 ? cleanText(cells[documentNoIndex]) : "";

    if (!slug && !documentNo) continue;
    if (!address) continue;

    rows.push({
      rowNumber: index + 1,
      slug,
      documentNo,
      address,
    });
  }

  return rows;
}

async function main() {
  const { dryRun, filePath, reportPath } = parseArgs();

  if (!existsSync(filePath)) {
    throw new Error(`Excel dosyası bulunamadı: ${filePath}`);
  }

  console.log("Excel okunuyor...");
  const rows = await readImportRows(filePath);
  console.log(`Kaynak: ${filePath}`);
  console.log(`Mod: ${dryRun ? "dry-run" : "import"}`);
  console.log(`Okunan satır: ${rows.length}`);

  const { prisma } = await import("../lib/db");

  const slugs = [...new Set(rows.map((row) => row.slug).filter(Boolean))];
  const documentNos = [
    ...new Set(rows.map((row) => row.documentNo).filter(Boolean)),
  ];

  const orFilters: Array<
    { slug: { in: string[] } } | { documentNo: { in: string[] } }
  > = [];
  if (slugs.length > 0) orFilters.push({ slug: { in: slugs } });
  if (documentNos.length > 0) orFilters.push({ documentNo: { in: documentNos } });

  const villas =
    orFilters.length === 0
      ? []
      : await prisma.villa.findMany({
          where: { OR: orFilters },
          select: {
            id: true,
            slug: true,
            name: true,
            documentNo: true,
            documentAddress: true,
          },
        });

  const bySlug = new Map(villas.map((villa) => [villa.slug, villa]));
  const byDocumentNo = new Map(
    villas
      .filter((villa) => villa.documentNo.trim())
      .map((villa) => [villa.documentNo.trim().toLowerCase(), villa])
  );

  const updates: Array<{ id: string; address: string }> = [];
  const errors: ImportError[] = [];
  let skippedUnmatched = 0;
  let skippedUnchanged = 0;

  for (const row of rows) {
    const villa =
      (row.slug ? bySlug.get(row.slug) : undefined) ??
      (row.documentNo
        ? byDocumentNo.get(row.documentNo.toLowerCase())
        : undefined);

    if (!villa) {
      skippedUnmatched += 1;
      errors.push({
        rowNumber: row.rowNumber,
        slug: row.slug,
        documentNo: row.documentNo,
        reason: "Villa eşleşmedi",
      });
      continue;
    }

    if (villa.documentAddress.trim() === row.address) {
      skippedUnchanged += 1;
      continue;
    }

    updates.push({ id: villa.id, address: row.address });
  }

  if (!dryRun && updates.length > 0) {
    for (let index = 0; index < updates.length; index += BATCH_SIZE) {
      const batch = updates.slice(index, index + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((item) =>
          prisma.villa.update({
            where: { id: item.id },
            data: { documentAddress: item.address },
          })
        )
      );
      console.log(
        `İşlendi: ${Math.min(index + BATCH_SIZE, updates.length)}/${updates.length}`
      );
    }
  }

  const report = {
    filePath,
    dryRun,
    parsedRows: rows.length,
    stats: {
      updated: updates.length,
      skippedUnmatched,
      skippedUnchanged,
      errors: errors.length,
    },
    sampleErrors: errors.slice(0, 25),
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Güncellenen: ${updates.length}`);
  console.log(`Eşleşmeyen: ${skippedUnmatched}`);
  console.log(`Zaten güncel: ${skippedUnchanged}`);
  console.log(`Rapor: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
