/**
 * Tüm villaların harici sync linklerini senkronlar.
 *
 *   npx tsx scripts/sync-villa-external-links.ts
 *   npx tsx scripts/sync-villa-external-links.ts --force
 *
 * Interval: VILLA_EXTERNAL_SYNC_INTERVAL_MS (varsayılan 1 saat).
 * --force: son sync zamanına bakmadan hepsini çalıştırır.
 */
import {
  syncAllVillaExternalLinks,
  getVillaExternalSyncIntervalMs,
} from "../lib/villa-external-sync";

async function main() {
  const force = process.argv.includes("--force");
  const intervalMs = getVillaExternalSyncIntervalMs();

  console.log(
    `Harici sync başlıyor (interval=${Math.round(intervalMs / 60_000)} dk, force=${force})`
  );

  const results = await syncAllVillaExternalLinks({
    skipRecentlySynced: !force,
  });
  const failed = results.filter((item) => !item.ok);
  const skipped = results.filter((item) => item.message.startsWith("Atlandı"));

  for (const result of results) {
    const prefix = result.message.startsWith("Atlandı")
      ? "SKIP"
      : result.ok
        ? "OK"
        : "ERR";
    console.log(
      `[${prefix}] ${result.villaName} #${result.slot} (${result.kind}): ${result.message}`
    );
  }

  console.log(
    `\nToplam ${results.length} slot, ${failed.length} hata, ${skipped.length} atlandı, ${
      results.length - failed.length - skipped.length
    } başarılı.`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
