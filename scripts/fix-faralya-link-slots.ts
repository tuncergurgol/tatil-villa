/**
 * Faralya 1–6: Link3 fiyat URL'lerini villa bazlı hepsivilla sayfalarına çeker.
 * Faralya 5–6: kırık Link2 (mustakil 404) → hepsivilla takvim URL.
 * Ardından L2 (takvim) + L3 (fiyat) senkronlar.
 *
 * npx tsx scripts/fix-faralya-link-slots.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { syncVillaExternalLinkSlot } from "../lib/villa-external-sync";

const prisma = new PrismaClient();

const FARALYA: Array<{
  villaId: number;
  hepsivilla: string;
  fixLink2: boolean;
}> = [
  {
    villaId: 230,
    hepsivilla: "https://www.hepsivilla.com/faralya-villas-1/",
    fixLink2: false,
  },
  {
    villaId: 231,
    hepsivilla: "https://www.hepsivilla.com/faralya-villas-2/",
    fixLink2: false,
  },
  {
    villaId: 232,
    hepsivilla: "https://www.hepsivilla.com/faralya-villas-3/",
    fixLink2: false,
  },
  {
    villaId: 233,
    hepsivilla: "https://www.hepsivilla.com/faralya-villas-4/",
    fixLink2: false,
  },
  {
    villaId: 422,
    hepsivilla: "https://www.hepsivilla.com/faralya-villas-5/",
    fixLink2: true,
  },
  {
    villaId: 423,
    hepsivilla: "https://www.hepsivilla.com/faralya-villas-6/",
    fixLink2: true,
  },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  for (const item of FARALYA) {
    const villa = await prisma.villa.findFirst({
      where: { villaId: item.villaId },
      select: {
        id: true,
        name: true,
        villaId: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
      },
    });
    if (!villa) {
      console.log(`#${item.villaId} bulunamadı`);
      continue;
    }

    const data: {
      externalSyncUrl3: string;
      externalSyncUrl2?: string;
    } = {
      externalSyncUrl3: item.hepsivilla,
    };
    if (item.fixLink2) {
      data.externalSyncUrl2 = item.hepsivilla;
    }

    console.log(
      `#${villa.villaId} ${villa.name}: L3 ${villa.externalSyncUrl3} -> ${item.hepsivilla}` +
        (item.fixLink2
          ? ` | L2 ${villa.externalSyncUrl2} -> ${item.hepsivilla}`
          : "")
    );

    if (dryRun) continue;

    await prisma.villa.update({ where: { id: villa.id }, data });

    if (item.fixLink2) {
      const r2 = await syncVillaExternalLinkSlot(villa.id, 2);
      console.log(`  Link2: ${r2.ok ? "OK" : "FAIL"} — ${r2.message}`);
    }
    const r3 = await syncVillaExternalLinkSlot(villa.id, 3);
    console.log(`  Link3: ${r3.ok ? "OK" : "FAIL"} — ${r3.message}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
