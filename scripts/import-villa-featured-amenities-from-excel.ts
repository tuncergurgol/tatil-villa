import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  EXCEL_FEATURED_SKIP,
  EXCEL_FEATURED_TO_AMENITY,
  type ExcelRow,
} from "../lib/villa-excel-amenities";

const DEFAULT_EXCEL_PATH =
  "c:/Users/BARAN/Downloads/Villa Öne Çıkan Özellikler.xlsx";

const EXCEL_PATH = process.argv[2] ?? DEFAULT_EXCEL_PATH;
const DRY_RUN = process.argv.includes("--dry-run");

const prisma = new PrismaClient();

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBool(value: unknown): boolean {
  const text = cleanText(value).toLocaleLowerCase("tr-TR");
  return text === "evet" || text === "true" || text === "1";
}

function parseVillaId(value: unknown): number | null {
  const parsed = parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findByNormalizedName(name: string, masterNames: Set<string>): string | null {
  if (masterNames.has(name)) return name;
  const key = normalizeKey(name);
  for (const master of masterNames) {
    if (normalizeKey(master) === key) return master;
  }
  return null;
}

function mapFeaturedColumn(
  column: string,
  featuredAmenityNames: Set<string>
): { amenity?: string; unmapped?: string; skipped?: boolean } {
  if (EXCEL_FEATURED_SKIP.has(column)) return { skipped: true };

  const alias = EXCEL_FEATURED_TO_AMENITY[column];
  if (alias) {
    const resolved = findByNormalizedName(alias, featuredAmenityNames);
    if (resolved) return { amenity: resolved };
    return { unmapped: column };
  }

  const direct = findByNormalizedName(column, featuredAmenityNames);
  if (direct) return { amenity: direct };

  return { unmapped: column };
}

function readFeaturedPropertiesSheet(excelPath: string) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName =
    workbook.SheetNames.find((name) =>
      normalizeKey(name).includes("one cikan")
    ) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: "",
  });

  const headerRowIndex = matrix.findIndex(
    (row) => cleanText(row[0]) === "ID" && cleanText(row[1]) === "Tesis Adı"
  );
  if (headerRowIndex < 0) {
    throw new Error("Excel dosyasında 'ID' / 'Tesis Adı' başlık satırı bulunamadı.");
  }

  const headers = matrix[headerRowIndex].map((cell) => cleanText(cell));
  const featureColumns = headers.slice(2).filter(Boolean);
  const rows: ExcelRow[] = [];

  for (const row of matrix.slice(headerRowIndex + 1)) {
    const villaId = parseVillaId(row[0]);
    if (!villaId) continue;

    const record: ExcelRow = {
      ID: villaId,
      "Tesis Adı": cleanText(row[1]),
    };
    for (let index = 2; index < headers.length; index += 1) {
      const column = headers[index];
      if (!column) continue;
      record[column] = row[index] ?? "";
    }
    rows.push(record);
  }

  return { sheetName, headers, featureColumns, rows };
}

function resolveFeaturedAmenitiesFromRow(
  row: ExcelRow,
  featureColumns: string[],
  featuredAmenityNames: Set<string>
) {
  const selected = new Set<string>();
  const unmappedColumns: string[] = [];

  for (const column of featureColumns) {
    if (!parseBool(row[column])) continue;
    const mapped = mapFeaturedColumn(column, featuredAmenityNames);
    if (mapped.amenity) selected.add(mapped.amenity);
    if (mapped.unmapped) unmappedColumns.push(mapped.unmapped);
  }

  return {
    featuredAmenities: [...selected].sort((a, b) => a.localeCompare(b, "tr")),
    unmappedColumns,
  };
}

function mergeVillaAmenities(
  currentAmenities: string[],
  featuredAmenityNames: Set<string>,
  nextFeaturedAmenities: string[]
) {
  const preserved = currentAmenities.filter(
    (amenity) => !featuredAmenityNames.has(amenity)
  );
  const merged = [...preserved, ...nextFeaturedAmenities];
  return [...new Set(merged)].sort((a, b) => a.localeCompare(b, "tr"));
}

async function main() {
  const { sheetName, featureColumns, rows } = readFeaturedPropertiesSheet(EXCEL_PATH);

  const featuredAmenityRows = await prisma.amenity.findMany({
    where: {
      active: true,
      category: { slug: "one-cikanlar" },
    },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const featuredAmenityNames = new Set(
    featuredAmenityRows.map((row) => row.name)
  );

  const unmappedColumns = new Map<string, number>();

  const villas = await prisma.villa.findMany({
    select: { id: true, villaId: true, name: true, amenities: true },
  });
  const villaByNumericId = new Map(
    villas
      .filter((villa) => villa.villaId != null)
      .map((villa) => [villa.villaId as number, villa])
  );

  let updated = 0;
  let unchanged = 0;
  let missingVillaId = 0;
  const samples: Array<{
    villaId: number;
    name: string;
    beforeFeatured: number;
    afterFeatured: number;
    featured: string[];
  }> = [];

  for (const row of rows) {
    const villaId = parseVillaId(row.ID);
    if (!villaId) continue;

    const villa = villaByNumericId.get(villaId);
    if (!villa) {
      missingVillaId += 1;
      continue;
    }

    const resolved = resolveFeaturedAmenitiesFromRow(
      row,
      featureColumns,
      featuredAmenityNames
    );

    for (const column of resolved.unmappedColumns) {
      unmappedColumns.set(column, (unmappedColumns.get(column) ?? 0) + 1);
    }

    const nextAmenities = mergeVillaAmenities(
      villa.amenities,
      featuredAmenityNames,
      resolved.featuredAmenities
    );

    const beforeFeatured = villa.amenities.filter((amenity) =>
      featuredAmenityNames.has(amenity)
    );
    const afterFeatured = resolved.featuredAmenities;
    const same =
      beforeFeatured.length === afterFeatured.length &&
      beforeFeatured.every((value, index) => value === afterFeatured[index]);

    if (same) {
      unchanged += 1;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.villa.update({
        where: { id: villa.id },
        data: { amenities: nextAmenities },
      });
    }

    updated += 1;
    if (samples.length < 8) {
      samples.push({
        villaId,
        name: cleanText(row["Tesis Adı"]) || villa.name,
        beforeFeatured: beforeFeatured.length,
        afterFeatured: afterFeatured.length,
        featured: afterFeatured,
      });
    }

    if (updated % 200 === 0 && updated > 0) {
      console.log(`${updated} villa güncellendi...`);
    }
  }

  const reportPath = resolve("scripts/import-villa-featured-amenities-report.json");
  const report = {
    updatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    excelPath: EXCEL_PATH,
    sheetName,
    featureColumns,
    featuredAmenityCount: featuredAmenityNames.size,
    totalExcelRows: rows.length,
    updatedVillas: updated,
    unchangedVillas: unchanged,
    missingVillaIdInDb: missingVillaId,
    unmappedColumns: [...unmappedColumns.entries()].map(([name, count]) => ({
      name,
      count,
    })),
    samples,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== Villa Öne Çıkan Özellik Import Özeti ===");
  console.log(`Excel satırı: ${rows.length}`);
  console.log(`Güncellenen villa: ${updated}`);
  console.log(`Değişmeyen villa: ${unchanged}`);
  console.log(`DB'de bulunamayan villaId: ${missingVillaId}`);
  console.log(`Dry-run: ${DRY_RUN ? "evet" : "hayır"}`);
  console.log(`Rapor: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
