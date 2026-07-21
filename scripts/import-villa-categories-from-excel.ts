import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  EXCEL_FACILITY_TO_MASTER,
  type ExcelRow,
} from "../lib/villa-excel-amenities";

const DEFAULT_EXCEL_PATH =
  "c:/Users/BARAN/Downloads/Villa Kategori Listesi.xlsx";

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

function mapFacilityColumn(
  column: string,
  masterFacilities: Set<string>
): { facility?: string; unmapped?: string } {
  const alias = EXCEL_FACILITY_TO_MASTER[column];
  if (alias) {
    const resolved = findByNormalizedName(alias, masterFacilities);
    if (resolved) return { facility: resolved };
    return { facility: alias };
  }

  const direct = findByNormalizedName(column, masterFacilities);
  if (direct) return { facility: direct };

  return { unmapped: column };
}

function slugify(value: string) {
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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readKategoriListesiSheet(excelPath: string) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames.includes("kategoriler")
    ? "kategoriler"
    : workbook.SheetNames[0];
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
  const categoryColumns = headers.slice(2).filter(Boolean);
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

  return { sheetName, headers, categoryColumns, rows };
}

function resolveFacilityCategoriesFromRow(
  row: ExcelRow,
  categoryColumns: string[],
  masterFacilities: Set<string>
) {
  const facilityCategories = new Set<string>();
  const unmappedFacilityColumns: string[] = [];

  for (const column of categoryColumns) {
    if (!parseBool(row[column])) continue;
    const mapped = mapFacilityColumn(column, masterFacilities);
    if (mapped.facility) facilityCategories.add(mapped.facility);
    if (mapped.unmapped) unmappedFacilityColumns.push(mapped.unmapped);
  }

  return {
    facilityCategories: [...facilityCategories].sort((a, b) => a.localeCompare(b, "tr")),
    unmappedFacilityColumns,
  };
}

async function ensureFacilityCategories(names: string[]) {
  for (const name of names) {
    const slug = slugify(name);
    const existing = await prisma.facilityCategory.findFirst({
      where: { OR: [{ name }, { slug }] },
      select: { id: true, name: true },
    });
    if (existing) continue;
    if (DRY_RUN) {
      console.log(`[dry-run] Kategori oluşturulacak: ${name}`);
      continue;
    }
    await prisma.facilityCategory.create({
      data: {
        name,
        slug,
      },
    });
    console.log(`Kategori oluşturuldu: ${name}`);
  }
}

async function main() {
  const { sheetName, categoryColumns, rows } = readKategoriListesiSheet(EXCEL_PATH);

  let masterFacilities = new Set(
    (await prisma.facilityCategory.findMany({ select: { name: true } })).map(
      (item) => item.name
    )
  );

  const neededFacilities = new Set<string>();
  const unmappedFacility = new Map<string, number>();

  for (const row of rows) {
    const resolved = resolveFacilityCategoriesFromRow(
      row,
      categoryColumns,
      masterFacilities
    );
    for (const name of resolved.facilityCategories) {
      if (!masterFacilities.has(name)) neededFacilities.add(name);
    }
    for (const column of resolved.unmappedFacilityColumns) {
      unmappedFacility.set(column, (unmappedFacility.get(column) ?? 0) + 1);
    }
  }

  if (neededFacilities.size > 0) {
    await ensureFacilityCategories([...neededFacilities]);
    masterFacilities = new Set(
      (await prisma.facilityCategory.findMany({ select: { name: true } })).map(
        (item) => item.name
      )
    );
  }

  const villas = await prisma.villa.findMany({
    select: { id: true, villaId: true, name: true, facilityCategories: true },
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
    before: number;
    after: number;
    categories: string[];
  }> = [];

  for (const row of rows) {
    const villaId = parseVillaId(row.ID);
    if (!villaId) continue;

    const villa = villaByNumericId.get(villaId);
    if (!villa) {
      missingVillaId += 1;
      continue;
    }

    const resolved = resolveFacilityCategoriesFromRow(
      row,
      categoryColumns,
      masterFacilities
    );

    const before = [...villa.facilityCategories].sort((a, b) =>
      a.localeCompare(b, "tr")
    );
    const after = resolved.facilityCategories;
    const same =
      before.length === after.length &&
      before.every((value, index) => value === after[index]);

    if (same) {
      unchanged += 1;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.villa.update({
        where: { id: villa.id },
        data: { facilityCategories: after },
      });
    }

    updated += 1;
    if (samples.length < 8) {
      samples.push({
        villaId,
        name: cleanText(row["Tesis Adı"]) || villa.name,
        before: before.length,
        after: after.length,
        categories: after,
      });
    }

    if (updated % 200 === 0 && updated > 0) {
      console.log(`${updated} villa güncellendi...`);
    }
  }

  const reportPath = resolve("scripts/import-villa-categories-report.json");
  const report = {
    updatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    excelPath: EXCEL_PATH,
    sheetName,
    categoryColumns,
    totalExcelRows: rows.length,
    updatedVillas: updated,
    unchangedVillas: unchanged,
    missingVillaIdInDb: missingVillaId,
    createdFacilityCategories: [...neededFacilities],
    unmappedFacilityColumns: [...unmappedFacility.entries()].map(([name, count]) => ({
      name,
      count,
    })),
    samples,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== Villa Kategori Import Özeti ===");
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
