/**
 * Villa Vadi 1–8 konum güncelleme.
 * Çalıştır: npx tsx scripts/update-villa-vadi-coordinates.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VILLA_NAMES = [
  "Villa Vadi 1",
  "Villa Vadi 2",
  "Villa Vadi 3",
  "Villa Vadi 4",
  "Villa Vadi 5",
  "Villa Vadi 6",
  "Villa Vadi 7",
  "Villa Vadi 8",
] as const;

const LATITUDE = 36.70062948063738;
const LONGITUDE = 29.046803853313264;

async function main() {
  const found = await prisma.villa.findMany({
    where: { name: { in: [...VILLA_NAMES] } },
    select: {
      id: true,
      name: true,
      villaId: true,
      latitude: true,
      longitude: true,
    },
  });

  console.log(`Bulunan villa: ${found.length}/${VILLA_NAMES.length}`);
  for (const villa of found) {
    console.log(
      `  ${villa.name} (VillaID ${villa.villaId ?? "—"}) → eski: ${villa.latitude}, ${villa.longitude}`
    );
  }

  const missing = VILLA_NAMES.filter(
    (name) => !found.some((villa) => villa.name === name)
  );
  if (missing.length > 0) {
    console.warn("Bulunamayan:", missing.join(", "));
  }

  const result = await prisma.villa.updateMany({
    where: { name: { in: [...VILLA_NAMES] } },
    data: {
      latitude: LATITUDE,
      longitude: LONGITUDE,
    },
  });

  console.log(`\nGüncellenen kayıt: ${result.count}`);
  console.log(`Yeni koordinat: ${LATITUDE}, ${LONGITUDE}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
