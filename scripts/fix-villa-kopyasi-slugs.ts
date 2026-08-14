/**
 * Kopya villa slug'larını güncel villa adına göre düzeltir.
 *
 *   npx tsx scripts/fix-villa-kopyasi-slugs.ts
 *   npx tsx scripts/fix-villa-kopyasi-slugs.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import {
  buildVillaSlugFromName,
  ensureUniqueVillaSlug,
  isLegacyKopyasiSlug,
} from "../lib/villa-slug";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const villas = await prisma.villa.findMany({
    select: { id: true, name: true, slug: true, villaId: true },
    orderBy: [{ villaId: "asc" }, { name: "asc" }],
  });

  const candidates = villas.filter((villa) => isLegacyKopyasiSlug(villa.slug));

  console.log(`Toplam villa: ${villas.length}`);
  console.log(`Düzeltilecek aday: ${candidates.length}`);

  let updated = 0;
  let skipped = 0;

  for (const villa of candidates) {
    const targetSlug = await ensureUniqueVillaSlug(
      buildVillaSlugFromName(villa.name),
      villa.id
    );

    if (targetSlug === villa.slug) {
      skipped += 1;
      continue;
    }

    console.log(
      `${dryRun ? "[dry-run] " : ""}${villa.villaId ?? "?"} | ${villa.name}\n  ${villa.slug} -> ${targetSlug}`
    );

    if (!dryRun) {
      await prisma.villa.update({
        where: { id: villa.id },
        data: { slug: targetSlug },
      });
    }
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        updated,
        skipped,
        candidates: candidates.length,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
