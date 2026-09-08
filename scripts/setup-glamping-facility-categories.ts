/**
 * Glamping Turkey (Site 4) yalnızca Bungalov + Domes tesislerini yayınlar.
 * Bu script "Domes" tesis kategorisini oluşturur ve adında dome/domes geçen
 * villaları bu kategoriye ekler. Tekrar çalıştırılabilir (idempotent).
 *
 *   npx tsx scripts/setup-glamping-facility-categories.ts
 */
import { prisma } from "../lib/db";

const DOMES_CATEGORY_NAME = "Domes";
const DOMES_CATEGORY_SLUG = "domes";
const DOME_NAME_PATTERN = /\bdomes?\b/i;

async function ensureDomesCategory() {
  const existing = await prisma.facilityCategory.findFirst({
    where: {
      OR: [{ slug: DOMES_CATEGORY_SLUG }, { name: DOMES_CATEGORY_NAME }],
    },
  });
  if (existing) {
    console.log(
      `[kategori] mevcut: ${existing.name} (${existing.slug}) published=${existing.published}`
    );
    return existing;
  }

  const maxSortOrder = await prisma.facilityCategory.aggregate({
    _max: { sortOrder: true },
  });
  const created = await prisma.facilityCategory.create({
    data: {
      name: DOMES_CATEGORY_NAME,
      slug: DOMES_CATEGORY_SLUG,
      description:
        "Doğayla iç içe, kubbe (dome) tasarımlı glamping konaklama üniteleri.",
      published: true,
      showInSearch: false,
      showInOffer: false,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
    },
  });
  console.log(`[kategori] olusturuldu: ${created.name} (${created.slug})`);
  return created;
}

async function main() {
  await ensureDomesCategory();

  const villas = await prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      originalName: true,
      active: true,
      facilityCategories: true,
    },
    orderBy: { villaId: "asc" },
  });

  const targets = villas.filter(
    (villa) =>
      DOME_NAME_PATTERN.test(villa.name) ||
      DOME_NAME_PATTERN.test(villa.originalName)
  );

  console.log(`\n[villa] adinda dome/domes gecen: ${targets.length}`);

  let updated = 0;
  for (const villa of targets) {
    if (villa.facilityCategories.includes(DOMES_CATEGORY_NAME)) {
      console.log(`  = #${villa.villaId} ${villa.name} (zaten Domes)`);
      continue;
    }
    await prisma.villa.update({
      where: { id: villa.id },
      data: {
        facilityCategories: [...villa.facilityCategories, DOMES_CATEGORY_NAME],
      },
    });
    updated += 1;
    console.log(`  + #${villa.villaId} ${villa.name} -> Domes eklendi`);
  }
  console.log(`\n[villa] guncellenen: ${updated}`);

  const categoryWhere = {
    active: true,
    facilityCategories: { hasSome: [DOMES_CATEGORY_NAME, "Bungalov"] },
  } as const;

  const inCategory = await prisma.villa.count({ where: categoryWhere });
  const withDocument = await prisma.villa.count({
    where: {
      ...categoryWhere,
      OR: [{ documentNo: { not: "" } }, { documentType: { not: null } }],
    },
  });

  const settings = await prisma.companySettings.findFirst({
    select: { publishUndocumentedVillaSiteKeys: true },
  });
  const undocumentedSites = settings?.publishUndocumentedVillaSiteKeys ?? [];

  console.log(`\n[sonuc] Bungalov+Domes aktif villa: ${inCategory}`);
  console.log(`[sonuc] bunlardan belgesi olan: ${withDocument}`);
  console.log(
    `[sonuc] belgesiz villa yayin siteleri: ${undocumentedSites.join(", ") || "(yok)"}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
