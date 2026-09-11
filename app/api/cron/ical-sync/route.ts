import { NextResponse } from "next/server";
import { syncAllVillaIcalSources } from "@/lib/villa-ical-import-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readCronSecret(request: Request) {
  return (
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret")
  );
}

export async function GET(request: Request) {
  const expected = process.env.ICAL_SYNC_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "ICAL_SYNC_SECRET tanımlı değil" },
      { status: 503 }
    );
  }

  const provided = readCronSecret(request);
  if (provided !== expected) {
    return NextResponse.json({ ok: false, message: "Yetkisiz" }, { status: 401 });
  }

  const results = await syncAllVillaIcalSources();
  const failed = results.filter((item) => !item.ok).length;

  return NextResponse.json({
    ok: failed === 0,
    total: results.length,
    failed,
    results,
  });
}
