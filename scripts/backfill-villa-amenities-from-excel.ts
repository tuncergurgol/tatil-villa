import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  readTesislerSheet,
  resolveVillaAmenitiesFromExcelRow,
} from "../lib/villa-excel-amenities";

const EXCEL_PATH =
  process.argv[2] ??
  "c:/Users/BARAN/Downloads/tesis-raporu-2026-07-04.xlsx";

const prisma = new PrismaClient();

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
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

async function ensureFacilityCategories(names: string[]) {
  for (const name of names) {
    const existing = await prisma.facilityCategory.findFirst({
      where: { name },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.facilityCategory.create({
      data: {
        name,
        slug: slugify(name),
      },
    });
    console.log(`Kategori oluşturuldu: ${name}`);
  }
}

async function main() {
  const { headers, rows } = readTesislerSheet(EXCEL_PATH);

  const masterAmenities = new Set(
    (await prisma.amenity.findMany({ select: { name: true } })).map(
      (item) => item.name
    )
  );
  let masterFacilities = new Set(
    (await prisma.facilityCategory.findMany({ select: { name: true } })).map(
      (item) => item.name
    )
  );

  const neededFacilities = new Set<string>();
  for (const row of rows) {
    const resolved = resolveVillaAmenitiesFromExcelRow(
      row,
      headers,
      masterAmenities,
      masterFacilities
    );
    for (const name of resolved.facilityCategories) {
      if (!masterFacilities.has(name)) neededFacilities.add(name);
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
    select: { id: true, slug: true, name: true },
  });
  const villaBySlug = new Map(
    villas.map((villa) => [villa.slug.toLocaleLowerCase("tr-TR"), villa])
  );

  let updated = 0;
  let missingSlug = 0;
  const unmappedAmenity = new Map<string, number>();
  const unmappedFacility = new Map<string, number>();

  for (const row of rows) {
    const slug = cleanText(row.Slug).toLocaleLowerCase("tr-TR");
    if (!slug) continue;

    const villa = villaBySlug.get(slug);
    if (!villa) {
      missingSlug += 1;
      continue;
    }

    const resolved = resolveVillaAmenitiesFromExcelRow(
      row,
      headers,
      masterAmenities,
      masterFacilities
    );

    for (const item of resolved.unmappedAmenityColumns) {
      unmappedAmenity.set(item, (unmappedAmenity.get(item) ?? 0) + 1);
    }
    for (const item of resolved.unmappedFacilityColumns) {
      unmappedFacility.set(item, (unmappedFacility.get(item) ?? 0) + 1);
    }

    await prisma.villa.update({
      where: { id: villa.id },
      data: {
        amenities: resolved.amenities,
        facilityCategories: resolved.facilityCategories,
      },
    });
    updated += 1;
    if (updated % 100 === 0) console.log(`${updated} villa güncellendi...`);
  }

  const reportPath = resolve("scripts/backfill-amenities-report.json");
  const report = {
    updatedAt: new Date().toISOString(),
    excelPath: EXCEL_PATH,
    updatedVillas: updated,
    missingSlugInDb: missingSlug,
    unmappedAmenityColumns: [...unmappedAmenity.entries()].map(([name, count]) => ({
      name,
      count,
    })),
    unmappedFacilityColumns: [...unmappedFacility.entries()].map(
      ([name, count]) => ({ name, count })
    ),
    createdFacilityCategories: [...neededFacilities],
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  const emptyAmenities = await prisma.villa.count({
    where: { amenities: { isEmpty: true } },
  });
  const emptyFacilities = await prisma.villa.count({
    where: { facilityCategories: { isEmpty: true } },
  });

  console.log("\n=== Olanak Backfill Özeti ===");
  console.log(`Güncellenen villa: ${updated}`);
  console.log(`Boş olanak: ${emptyAmenities}`);
  console.log(`Boş kategori: ${emptyFacilities}`);
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
