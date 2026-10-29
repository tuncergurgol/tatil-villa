/**
 * Matris kategori stok envanteri (SEO_MATRIX_MIN_STOCK).
 * Çalıştır: npx tsx scripts/report-seo-matrix-stock.ts
 * Çıktı: scripts/deploy/seo-matrix-stock.md
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/db";
import { getVillaSearchResults } from "../lib/queries/villas";
import {
  SEO_MATRIX_FACILITY_SLUGS,
  SEO_MATRIX_MIN_STOCK,
  SEO_MATRIX_REGION_SLUGS,
  isStockIndexable,
  matrixFacilitiesForSite,
} from "../lib/seo-matrix";
import { listPublicSiteKeys, type PublicSiteKey } from "../lib/public-site-keys";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("DATABASE_URL=")) continue;
    let value = trimmed.slice("DATABASE_URL=".length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env.DATABASE_URL = value;
    return;
  }
}

async function countFor(
  siteKey: PublicSiteKey,
  facilityName: string,
  regionSlug?: string
) {
  const result = await getVillaSearchResults({
    region: regionSlug,
    facilities: [facilityName],
    page: 1,
    pageSize: 1,
    siteKey,
  });
  return result.totalCount;
}

async function main() {
  loadDatabaseUrl();
  const facilities = await prisma.facilityCategory.findMany({
    where: { slug: { in: [...SEO_MATRIX_FACILITY_SLUGS] } },
    select: { slug: true, name: true },
  });
  const bySlug = new Map(facilities.map((f) => [f.slug, f.name]));
  const lines: string[] = [
    `# SEO matris stok envanteri`,
    ``,
    `Oluşturma: ${new Date().toISOString()}`,
    `Eşik: SEO_MATRIX_MIN_STOCK = ${SEO_MATRIX_MIN_STOCK}`,
    ``,
  ];

  for (const siteKey of listPublicSiteKeys()) {
    lines.push(`## ${siteKey}`, ``);
    const allowed = new Set(matrixFacilitiesForSite(siteKey));
    const indexable: string[] = [];
    const thin: string[] = [];

    for (const facilitySlug of SEO_MATRIX_FACILITY_SLUGS) {
      if (!allowed.has(facilitySlug)) continue;
      const name = bySlug.get(facilitySlug);
      if (!name) {
        thin.push(`- \`/kategori/${facilitySlug}\` — tesis kaydı yok`);
        continue;
      }
      const globalCount = await countFor(siteKey, name);
      const globalPath = `/kategori/${facilitySlug}`;
      if (isStockIndexable(globalCount)) {
        indexable.push(`- \`${globalPath}\` — ${globalCount}`);
      } else {
        thin.push(`- \`${globalPath}\` — ${globalCount}`);
      }

      for (const regionSlug of SEO_MATRIX_REGION_SLUGS) {
        const count = await countFor(siteKey, name, regionSlug);
        const path = `/kategori/${regionSlug}-${facilitySlug}`;
        if (isStockIndexable(count)) {
          indexable.push(`- \`${path}\` — ${count}`);
        } else if (count > 0) {
          thin.push(`- \`${path}\` — ${count}`);
        }
      }
    }

    lines.push(`### Indexlenebilir (≥ ${SEO_MATRIX_MIN_STOCK})`, ``);
    lines.push(...(indexable.length ? indexable : ["- (yok)"]), ``);
    lines.push(`### İnce / noindex (< ${SEO_MATRIX_MIN_STOCK}, stok > 0)`, ``);
    lines.push(...(thin.length ? thin : ["- (yok)"]), ``);
  }

  const out = resolve(process.cwd(), "scripts/deploy/seo-matrix-stock.md");
  writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
  console.log(`Yazıldı: ${out}`);
  console.log(
    `Indexlenebilir satır ~${lines.filter((l) => l.startsWith("- `/kategori")).length}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
