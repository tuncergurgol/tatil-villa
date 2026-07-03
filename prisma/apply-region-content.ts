import { PrismaClient } from "@prisma/client";
import {
  getRegionContentFields,
  REGION_CONTENT_BY_SLUG,
} from "./region-content-data";

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  let missing = 0;

  for (const slug of Object.keys(REGION_CONTENT_BY_SLUG)) {
    const fields = getRegionContentFields(slug);
    if (!fields) continue;

    const region = await prisma.region.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!region) {
      console.warn(`Bulunamadı: ${slug}`);
      missing += 1;
      continue;
    }

    await prisma.region.update({
      where: { slug },
      data: fields,
    });

    console.log(`Güncellendi: ${region.name} (${slug})`);
    updated += 1;
  }

  console.log(`\nToplam ${updated} bölge içeriği güncellendi.`);
  if (missing > 0) {
    console.log(`${missing} slug veritabanında bulunamadı.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
