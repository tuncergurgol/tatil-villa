/**
 * Tek seferlik: giriş günü bugünden önce olan ONAYLANDI rezervasyonların
 * konaklama durumunu YAPILDI yapar.
 *
 * Çalıştır: npx tsx scripts/backfill-stay-status-yapildi.ts
 */
import { runStayStatusAutoComplete } from "../lib/stay-status-auto-complete";

async function main() {
  const result = await runStayStatusAutoComplete({
    catchUpPast: true,
    checkInToday: false,
  });

  console.log(
    JSON.stringify(
      {
        todayKey: result.todayKey,
        updatedCount: result.updatedCount,
        rewardedCount: result.rewardedCount,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
