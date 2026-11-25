/**
 * Arama motoru doğrulama durumunu özetler.
 *   npx tsx scripts/report-search-verification.ts
 */
import { prisma } from "../lib/db";
import { listPublicSiteKeys, getPublicSiteMeta } from "../lib/public-site-keys";
import { existsSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const rows = await prisma.publicSiteTracking.findMany();
  const byKey = new Map(rows.map((row) => [row.siteKey, row]));

  console.log("=== Webmaster / Analytics doğrulama ===\n");
  for (const siteKey of listPublicSiteKeys()) {
    const meta = getPublicSiteMeta(siteKey);
    const row = byKey.get(siteKey);
    console.log(`${meta.label} (${meta.domain}) [${siteKey}]`);
    console.log(`  GSC meta:   ${row?.googleSearchConsoleCode ? "VAR" : "YOK"}`);
    console.log(`  Bing meta:  ${row?.bingWebmasterCode ? "VAR" : "YOK — Admin → Acente → Şirket → Analytics"}`);
    console.log(`  Yandex meta:${row?.yandexWebmasterCode ? "VAR" : "YOK (HTML dosyası da kullanılabilir)"}`);
    console.log("");
  }

  const yandexFiles = [
    "yandex_2bc7afd44d0cd5c4.html",
    "yandex_a4efc17400421e66.html",
    "yandex_33c5486972148ca8.html",
  ];
  console.log("=== public/ Yandex HTML dosyaları ===");
  for (const file of yandexFiles) {
    const ok = existsSync(join(process.cwd(), "public", file));
    console.log(`  ${file}: ${ok ? "OK" : "EKSİK"}`);
  }
  console.log(
    "\nYandex Webmaster'da her site için Doğrula + /sitemap.xml ekleyin."
  );
  console.log(
    "Bing: bing.com/webmasters → site ekle → HTML meta content değerini Analytics'e yapıştırın."
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
