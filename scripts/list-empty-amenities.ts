import { PrismaClient } from "@prisma/client";
import { readTesislerSheet } from "../lib/villa-excel-amenities";

const prisma = new PrismaClient();

function isEvet(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR") === "evet";
}

async function main() {
  const { headers, rows } = readTesislerSheet(
    "c:/Users/BARAN/Downloads/tesis-raporu-2026-07-04.xlsx"
  );
  const amenityStart = headers.indexOf("Banyo veya duş");
  const facilityStart = headers.indexOf("Balayı Villası");
  const amenityCols = headers.slice(amenityStart, facilityStart);
  const facilityCols = headers.slice(facilityStart);

  const rowBySlug = new Map(
    rows.map((row) => [String(row.Slug ?? "").toLowerCase(), row])
  );

  const empty = await prisma.villa.findMany({
    where: { amenities: { isEmpty: true } },
    select: { slug: true, name: true, location: true },
    orderBy: { name: "asc" },
  });

  console.log(`Toplam boş olanaklı villa: ${empty.length}\n`);

  for (const villa of empty) {
    const row = rowBySlug.get(villa.slug);
    let amenityEvet = 0;
    let facilityEvet = 0;
    const amenityEvetCols: string[] = [];
    const facilityEvetCols: string[] = [];

    if (row) {
      for (const col of amenityCols) {
        if (isEvet(row[col])) {
          amenityEvet += 1;
          amenityEvetCols.push(col);
        }
      }
      for (const col of facilityCols) {
        if (isEvet(row[col])) {
          facilityEvet += 1;
          facilityEvetCols.push(col);
        }
      }
    }

    console.log(`- ${villa.name} (${villa.slug})`);
    console.log(`  Bölge: ${villa.location}`);
    console.log(
      `  Excel: ${amenityEvet} olanak Evet, ${facilityEvet} kategori Evet`
    );
    if (amenityEvetCols.length > 0) {
      console.log(`  Excel olanaklar: ${amenityEvetCols.join(", ")}`);
    }
    if (facilityEvetCols.length > 0) {
      console.log(`  Excel kategoriler: ${facilityEvetCols.join(", ")}`);
    }
    console.log("");
  }
}

main()
  .finally(async () => prisma.$disconnect());
