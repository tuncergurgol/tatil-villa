import { NextResponse } from "next/server";
import { syncAllVillaExternalLinks } from "@/lib/villa-external-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Harici villa sync cron endpoint.
 * Auth: CRON_SECRET (header x-cron-secret | Authorization Bearer | ?secret=)
 * Interval önerisi: saatte 1 — VILLA_EXTERNAL_SYNC_INTERVAL_MS (varsayılan 3600000)
 *
 * Vercel cron örneği (vercel.json):
 * { "crons": [{ "path": "/api/cron/villa-external-sync", "schedule": "0 * * * *" }] }
 */
function readCronSecret(request: Request) {
  return (
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret")
  );
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET tanımlı değil" },
      { status: 503 }
    );
  }

  const provided = readCronSecret(request);
  if (provided !== expected) {
    return NextResponse.json({ ok: false, message: "Yetkisiz" }, { status: 401 });
  }

  const force =
    new URL(request.url).searchParams.get("force") === "1" ||
    new URL(request.url).searchParams.get("force") === "true";

  const results = await syncAllVillaExternalLinks({
    skipRecentlySynced: !force,
  });
  const failed = results.filter((item) => !item.ok).length;
  const skipped = results.filter((item) =>
    item.message.startsWith("Atlandı")
  ).length;

  return NextResponse.json({
    ok: failed === 0,
    total: results.length,
    failed,
    skipped,
    results,
  });
}
