import { NextResponse } from "next/server";
import { runCalendarPriceTransferAutoUpdate } from "@/lib/calendar-price-transfer-auto-sync";

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

  const result = await runCalendarPriceTransferAutoUpdate({ force });

  return NextResponse.json({
    ok: result.ok,
    skipped: result.skipped,
    message: result.message,
    total: result.total,
    okCount: result.okCount,
    failCount: result.failCount,
  });
}
