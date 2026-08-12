import { NextResponse } from "next/server";
import { runKonutBelgeDailyCheck } from "@/lib/konut-belge-daily-check";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

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

  const result = await runKonutBelgeDailyCheck();

  return NextResponse.json({
    ok: result.ok,
    checkedCount: result.checkedCount,
    validCount: result.validCount,
    invalidCount: result.invalidCount,
    errorCount: result.errorCount,
    deletedCount: result.deletedCount,
    deleted: result.deleted,
    emailSent: result.emailSent,
    message: result.message,
  });
}
