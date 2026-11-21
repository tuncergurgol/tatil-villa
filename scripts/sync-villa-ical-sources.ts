import { syncAllVillaIcalSources } from "../lib/villa-ical-import-service";

async function main() {
  const results = await syncAllVillaIcalSources();
  const failed = results.filter((item) => !item.ok);

  for (const result of results) {
    const prefix = result.ok ? "OK" : "ERR";
    console.log(`[${prefix}] ${result.sourceName}: ${result.message}`);
  }

  console.log(
    `\nToplam ${results.length} kaynak, ${failed.length} hata, ${
      results.length - failed.length
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
