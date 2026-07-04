import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const wb = XLSX.readFile(
    "c:/Users/BARAN/Downloads/tesis-raporu-2026-07-04.xlsx"
  );
  const headers = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Tesisler, {
    header: 1,
  })[0];
  const aStart = headers.indexOf("Banyo veya duş");
  const fStart = headers.indexOf("Balayı Villası");
  const amenityCols = headers.slice(aStart, fStart);
  const facilityCols = headers.slice(fStart);

  const dbA = new Set(
    (await prisma.amenity.findMany({ select: { name: true } })).map(
      (x) => x.name
    )
  );
  const dbF = new Set(
    (await prisma.facilityCategory.findMany({ select: { name: true } })).map(
      (x) => x.name
    )
  );

  console.log(
    "MISSING AMENITY",
    amenityCols.filter((c) => !dbA.has(c))
  );
  console.log(
    "MISSING FACILITY",
    facilityCols.filter((c) => !dbF.has(c))
  );
}

main()
  .finally(async () => prisma.$disconnect());
