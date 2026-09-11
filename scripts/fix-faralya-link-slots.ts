/**
 * Faralya link onarımı (Link 2 = takvim, Link 3 = fiyat):
 * - L3: yalnızca price_block olan faralya-villas-1 (ortak fiyat)
 * - L2 Faralya 6: hepsivilla faralya-villas-6 (takvim; mustakil 404)
 * - L2 Faralya 5: mustakil 404 + hepsivilla sayfa bozuk → L2 boşaltılmaz, uyarı
 *
 * npx tsx scripts/fix-faralya-link-slots.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { syncVillaExternalLinkSlot } from "../lib/villa-external-sync";

const prisma = new PrismaClient();

const SHARED_PRICE = "https://www.hepsivilla.com/faralya-villas-1/";

const FARALYA: Array<{
  villaId: number;
  link2?: string | null;
  link3: string;
}> = [
  { villaId: 230, link3: SHARED_PRICE },
  { villaId: 231, link3: SHARED_PRICE },
  { villaId: 232, link3: SHARED_PRICE },
  { villaId: 233, link3: SHARED_PRICE },
  // 5: hepsivilla sayfası bozuk (id_item yok); mustakil 404 — L2 elle kontrol
  { villaId: 422, link3: SHARED_PRICE },
  {
    villaId: 423,
    link2: "https://www.hepsivilla.com/faralya-villas-6/",
    link3: SHARED_PRICE,
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
    } = { externalSyncUrl3: item.link3 };

    if (item.link2) {
      data.externalSyncUrl2 = item.link2;
    }

    console.log(
      `#${villa.villaId} ${villa.name}: L3 -> ${item.link3}` +
        (item.link2 ? ` | L2 -> ${item.link2}` : "")
    );

    if (dryRun) continue;

    await prisma.villa.update({ where: { id: villa.id }, data });

    if (item.link2) {
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
