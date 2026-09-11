import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const EXCEL_PATH =
  "c:/Users/BARAN/Downloads/tesis-raporu-2026-07-04.xlsx";

const prisma = new PrismaClient();

function isEvet(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR") === "evet";
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets.Tesisler;
  const headers = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
  })[0];
  const amenityStart = headers.findIndex((h) => h === "Banyo veya duş");
  const facilityStart = headers.findIndex((h) => h === "Balayı Villası");
  const amenityCols = headers.slice(amenityStart, facilityStart);
  const facilityCols = headers.slice(facilityStart);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const sampleSlug = "villa-white-house";
  const sample = rows.find(
    (r) => String(r.Slug ?? "").toLowerCase() === sampleSlug
  );

  const dbAmenities = await prisma.amenity.findMany({
    select: { name: true },
  });
  const dbFacilityCategories = await prisma.facilityCategory.findMany({
    select: { name: true },
  });
  const amenityNames = new Set(dbAmenities.map((a) => a.name));
  const facilityNames = new Set(dbFacilityCategories.map((f) => f.name));

  const villas = await prisma.villa.findMany({
    select: { slug: true, amenities: true, facilityCategories: true },
  });
  const emptyAmenities = villas.filter((v) => v.amenities.length === 0);
  const emptyFacilities = villas.filter(
    (v) => v.facilityCategories.length === 0
  );

  let excelRowsWithAmenityEvet = 0;
  let excelRowsWithFacilityEvet = 0;
  for (const row of rows) {
    const hasAmenity = amenityCols.some((col) => isEvet(row[col]));
    const hasFacility = facilityCols.some((col) => isEvet(row[col]));
    if (hasAmenity) excelRowsWithAmenityEvet += 1;
    if (hasFacility) excelRowsWithFacilityEvet += 1;
  }

  const dbWithAmenity = villas.filter((v) => v.amenities.length > 0).length;
  const dbWithFacility = villas.filter(
    (v) => v.facilityCategories.length > 0
  ).length;

  const manualSlugs = [
    "villa-olive",
    "villa-sento",
    "villa-sato-buket",
    "villa-bella-doger",
    "villa-sur",
    "villa-ayda",
  ];
  const manualMissing = villas
    .filter((v) => manualSlugs.includes(v.slug))
    .map((v) => ({
      slug: v.slug,
      amenities: v.amenities.length,
      facilityCategories: v.facilityCategories.length,
    }));

  let excelAmenityEvet = 0;
  let excelFacilityEvet = 0;
  const excelAmenityList: string[] = [];
  const excelFacilityList: string[] = [];

  if (sample) {
    for (const col of amenityCols) {
      if (isEvet(sample[col])) {
        excelAmenityEvet += 1;
        excelAmenityList.push(col);
      }
    }
    for (const col of facilityCols) {
      if (isEvet(sample[col])) {
        excelFacilityEvet += 1;
        excelFacilityList.push(col);
      }
    }
  }

  const dbVilla = await prisma.villa.findFirst({
    where: { slug: sampleSlug },
    select: { amenities: true, facilityCategories: true },
  });

  const amenityNotInMaster = excelAmenityList.filter((n) => !amenityNames.has(n));
  const facilityNotInMaster = excelFacilityList.filter(
    (n) => !facilityNames.has(n)
  );

  console.log(
    JSON.stringify(
      {
        excelAmenityColumns: amenityCols.length,
        excelFacilityColumns: facilityCols.length,
        sampleSlug,
        sampleExcelEvet: {
          amenities: excelAmenityEvet,
          facilityCategories: excelFacilityEvet,
        },
        sampleDbCounts: {
          amenities: dbVilla?.amenities.length ?? 0,
          facilityCategories: dbVilla?.facilityCategories.length ?? 0,
        },
        totalVillas: villas.length,
        excelRowsWithAmenityEvet,
        excelRowsWithFacilityEvet,
        dbWithAmenity,
        dbWithFacility,
        villasWithEmptyAmenities: emptyAmenities.length,
        villasWithEmptyFacilityCategories: emptyFacilities.length,
        manuallyImportedMissingAmenities: manualMissing,
        excelAmenityNamesNotInAmenityTable: amenityNotInMaster,
        excelFacilityNamesNotInFacilityCategoryTable: facilityNotInMaster,
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
