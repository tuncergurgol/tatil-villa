/**
 * Villa Bala + Villa Bala Duo — yazvillalari.com Link 1 düzeltme
 *   npx tsx scripts/sync-villa-bala-yazvillalari.ts --list
 *   npx tsx scripts/sync-villa-bala-yazvillalari.ts --dry-run
 *   npx tsx scripts/sync-villa-bala-yazvillalari.ts
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";

const TARGETS = [
  {
    label: "Villa Bala",
    url: "https://www.yazvillalari.com/Villa-Bala",
    slugCandidates: ["villa-bala", "villa-bala-1"],
    nameContains: ["Villa Bala"],
  },
  {
    label: "Villa Bala Duo",
    url: "https://www.yazvillalari.com/Villa-Bala-duo",
    slugCandidates: ["villa-bala-2", "villa-bala-duo", "villa-baladuo"],
    nameContains: ["Bala Duo", "Bala 2", "Bala2"],
  },
] as const;

async function findVilla(target: (typeof TARGETS)[number]) {
  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        ...target.slugCandidates.map((slug) => ({
          slug: { equals: slug, mode: "insensitive" as const },
        })),
        ...target.nameContains.map((name) => ({
          name: { contains: name, mode: "insensitive" as const },
        })),
        {
          externalSyncUrl1: {
            contains: target.url.split("/").pop() || "Villa-Bala",
            mode: "insensitive" as const,
          },
        },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncLastMessage1: true,
      externalSyncLastSyncedAt1: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  const filtered =
    target.label === "Villa Bala"
      ? candidates.filter(
          (row) =>
            !/bala[- ]?2|bala[- ]?duo|baladuo/i.test(row.slug) &&
            !/bala\s*2|bala\s*duo/i.test(row.name)
        )
      : candidates;

  const bySlug = target.slugCandidates
    .map((slug) =>
      filtered.find((row) => row.slug.toLowerCase() === slug.toLowerCase())
    )
    .find(Boolean);

  return { candidates: filtered, villa: bySlug ?? filtered[0] ?? null };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");
  const smokeOnly = process.argv.includes("--smoke");

  if (smokeOnly || !listOnly) {
    for (const target of TARGETS) {
      try {
        const scraped = await scrapeExternalVillaPage(target.url);
        const booked = [...scraped.occupancyByDateKey.values()].filter(
          (v) => v === "BOOKED"
        ).length;
        console.log(
          `SCRAPE ${target.label}: strategy=${scraped.strategy} periods=${scraped.periods.length} days=${scraped.occupancyByDateKey.size} booked=${booked}`
        );
        if (scraped.warnings[0]) {
          console.log(`  warning: ${scraped.warnings[0]}`);
        }
      } catch (error) {
        console.log(
          `SCRAPE FAIL ${target.label}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
    if (smokeOnly) return;
  }

  for (const target of TARGETS) {
    const { candidates, villa } = await findVilla(target);
    console.log(`\n=== ${target.label} ===`);
    console.log(`URL: ${target.url}`);
    console.log("Adaylar:");
    for (const row of candidates) {
      console.log(
        `- ${row.villaId ?? "-"} | ${row.name} | ${row.slug} | link1=${row.externalSyncUrl1 || "(boş)"} | msg=${row.externalSyncLastMessage1 || "-"}`
      );
    }

    if (listOnly) continue;
    if (!villa) {
      console.log("FAIL: villa bulunamadı");
      continue;
    }

    console.log(
      `Hedef: ${villa.villaId ?? "-"} ${villa.name} (${villa.slug})`
    );

    if (dryRun) {
      console.log("Dry-run — değişiklik yok");
      continue;
    }

    const saved = await setVillaExternalSyncUrl(villa.id, 1, target.url);
    if (!saved.ok) {
      console.log("FAIL set url:", saved.message);
      continue;
    }

    await sleep(800);
    const result = await syncVillaExternalLinkSlot(villa.id, 1, {
      urlOverride: target.url,
    });
    console.log(result.ok ? "OK" : "FAIL", result.message);
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
