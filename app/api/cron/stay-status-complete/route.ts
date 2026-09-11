import { NextResponse } from "next/server";
import { runStayStatusAutoComplete } from "@/lib/stay-status-auto-complete";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readCronSecret(request: Request) {
  return (
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret")
  );
}

/**
 * Giriş günü 23:50 — ONAYLANDI rezervasyonların konaklama durumunu YAPILDI yapar.
 * Geçmişte kaçanlar için catch-up da çalışır.
 */
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

  const result = await runStayStatusAutoComplete({
    catchUpPast: true,
    checkInToday: true,
  });

  return NextResponse.json({
    ok: result.ok,
    todayKey: result.todayKey,
    updatedCount: result.updatedCount,
    rewardedCount: result.rewardedCount,
  });
}
