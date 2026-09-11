import { writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  fetchTatildeyizRegions,
  type TatildeyizCrmRegionMapped,
} from "../lib/tatildeyiz-regions";

const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-regions-report.json"
);

const prisma = new PrismaClient();

type RegionResult = {
  slug: string;
  name: string;
  crmId: number;
  status: "updated" | "skipped" | "missing" | "duplicate" | "error";
  changedFields?: string[];
  error?: string;
};

type ImportOptions = {
  dryRun: boolean;
  updateParents: boolean;
};

function parseArgs(): ImportOptions {
  return {
    dryRun: process.argv.includes("--dry-run"),
    updateParents: !process.argv.includes("--skip-parents"),
  };
}

function regionUpdateData(region: TatildeyizCrmRegionMapped) {
  return {
    name: region.name,
    level: region.level,
    image: region.image,
    description: region.description,
    longDescription: region.longDescription,
    seoTitle: region.seoTitle,
    seoDescription: region.seoDescription,
    seoKeywords: region.seoKeywords,
    published: region.published,
    active: region.published,
    showInSearch: region.showInSearch,
    showInOffer: region.showInOffer,
    showOnHome: region.showOnHome,
    sortOrder: region.sortOrder,
    mernisIlceCode: region.mernisIlceCode,
  };
}

function diffFields(
  existing: Record<string, unknown>,
  next: Record<string, unknown>
): string[] {
  const changed: string[] = [];
  for (const [key, value] of Object.entries(next)) {
    const current = existing[key];
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      changed.push(key);
    }
  }
  return changed;
}

async function main() {
  const options = parseArgs();
  const startedAt = new Date().toISOString();
  const results: RegionResult[] = [];

  console.log(
    `Tatildeyiz bölge import başlıyor (dryRun=${options.dryRun}, updateParents=${options.updateParents})`
  );

  const crmRegions = await fetchTatildeyizRegions();
  const slugGroups = new Map<string, TatildeyizCrmRegionMapped[]>();

  for (const region of crmRegions) {
    const group = slugGroups.get(region.slug) ?? [];
    group.push(region);
    slugGroups.set(region.slug, group);
  }

  const duplicateSlugs = [...slugGroups.entries()].filter(
    ([, group]) => group.length > 1
  );

  if (duplicateSlugs.length > 0) {
    console.warn(
      `Uyarı: ${duplicateSlugs.length} slug CRM'de birden fazla kayda karşılık geliyor (ilk kayıt kullanılacak):`
    );
    for (const [slug, group] of duplicateSlugs) {
      console.warn(
        `  - ${slug}: ${group.map((item) => `${item.name} (#${item.crmId})`).join(", ")}`
      );
      results.push({
        slug,
        name: group[1]?.name ?? group[0].name,
        crmId: group[1]?.crmId ?? 0,
        status: "duplicate",
        error: `Slug çakışması, yalnızca #${group[0].crmId} güncellendi`,
      });
    }
  }

  const selectedBySlug = new Map<string, TatildeyizCrmRegionMapped>();
  for (const [slug, group] of slugGroups) {
    selectedBySlug.set(slug, group[0]);
  }

  const dbRegions = await prisma.region.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      level: true,
      image: true,
      description: true,
      longDescription: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      published: true,
      active: true,
      showInSearch: true,
      showInOffer: true,
      showOnHome: true,
      sortOrder: true,
      mernisIlceCode: true,
      parentId: true,
    },
  });

  const dbBySlug = new Map(dbRegions.map((region) => [region.slug, region]));
  const crmIdToSlug = new Map<number, string>();
  for (const region of selectedBySlug.values()) {
    crmIdToSlug.set(region.crmId, region.slug);
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const crmRegion of selectedBySlug.values()) {
    const existing = dbBySlug.get(crmRegion.slug);

    if (!existing) {
      results.push({
        slug: crmRegion.slug,
        name: crmRegion.name,
        crmId: crmRegion.crmId,
        status: "missing",
        error: "Veritabanında slug bulunamadı",
      });
      continue;
    }

    const data = regionUpdateData(crmRegion);
    const changedFields = diffFields(existing, data);

    if (changedFields.length === 0) {
      results.push({
        slug: crmRegion.slug,
        name: crmRegion.name,
        crmId: crmRegion.crmId,
        status: "skipped",
      });
      skippedCount += 1;
      continue;
    }

    if (!options.dryRun) {
      try {
        await prisma.region.update({
          where: { id: existing.id },
          data,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Bilinmeyen hata";
        results.push({
          slug: crmRegion.slug,
          name: crmRegion.name,
          crmId: crmRegion.crmId,
          status: "error",
          error: message,
        });
        continue;
      }
    }

    results.push({
      slug: crmRegion.slug,
      name: crmRegion.name,
      crmId: crmRegion.crmId,
      status: "updated",
      changedFields,
    });
    updatedCount += 1;
    console.log(
      `[updated] ${crmRegion.slug} (${changedFields.join(", ")})`
    );
  }

  let parentUpdates = 0;

  if (options.updateParents) {
    const refreshed = await prisma.region.findMany({
      select: { id: true, slug: true, parentId: true },
    });
    const idBySlug = new Map(refreshed.map((region) => [region.slug, region.id]));

    for (const crmRegion of selectedBySlug.values()) {
      const existing = dbBySlug.get(crmRegion.slug);
      if (!existing) continue;

      let nextParentId: string | null = null;
      if (crmRegion.parentCrmId != null) {
        const parentSlug = crmIdToSlug.get(crmRegion.parentCrmId);
        if (parentSlug) {
          nextParentId = idBySlug.get(parentSlug) ?? null;
        }
      }

      if (existing.parentId === nextParentId) continue;

      if (!options.dryRun) {
        await prisma.region.update({
          where: { id: existing.id },
          data: { parentId: nextParentId },
        });
      }

      parentUpdates += 1;
      console.log(
        `[parent] ${crmRegion.slug} → ${nextParentId ? "güncellendi" : "kök"}`
      );
    }
  }

  const missingInDb = results.filter((item) => item.status === "missing");
  const crmSlugs = new Set(selectedBySlug.keys());
  const onlyInDb = dbRegions
    .filter((region) => !crmSlugs.has(region.slug))
    .map((region) => region.slug);

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    options,
    source: "https://api.tatildeyiz.com.tr/v1/admin/regionsListSwr",
    fieldMapping: {
      sefUrl: "slug",
      name: "name",
      previewImg: "image",
      explain: "description",
      longDesc: "longDescription",
      seoTitle: "seoTitle",
      seoDesc: "seoDescription",
      seoKeywords: "seoKeywords",
      onList: "published + active",
      onSearchList: "showInSearch",
      onOfferList: "showInOffer",
      showOnHomepage: "showOnHome",
      priority: "sortOrder",
      mernisCode: "mernisIlceCode",
      parentId: "parentId (slug eşlemesi ile)",
      level: "CRM ağacı derinliğinden türetilir (IL / ILCE / MAHALLE)",
    },
    summary: {
      crmTotal: crmRegions.length,
      dbTotal: dbRegions.length,
      updated: updatedCount,
      skipped: skippedCount,
      missingInDb: missingInDb.length,
      onlyInDb: onlyInDb.length,
      parentUpdates,
      duplicateSlugs: duplicateSlugs.length,
      errors: results.filter((item) => item.status === "error").length,
    },
    onlyInDb,
    results,
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`\nRapor: ${REPORT_PATH}`);
  console.log(
    `Özet: ${report.summary.updated} güncellendi, ${report.summary.skipped} değişmedi, ${report.summary.missingInDb} DB'de yok, ${report.summary.onlyInDb} yalnızca DB'de, ${report.summary.parentUpdates} üst bölge güncellendi`
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
