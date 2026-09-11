import { NextResponse } from "next/server";
import type { BtransDateBasis } from "@/lib/btrans-report";
import { runBtransMonthlyReport } from "@/lib/btrans-monthly-report";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readCronSecret(request: Request) {
  return (
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret")
  );
}

function parseOptionalInt(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

  const url = new URL(request.url);
  const year = parseOptionalInt(url.searchParams.get("year"));
  const month = parseOptionalInt(url.searchParams.get("month"));
  const dateBasisParam = url.searchParams.get("dateBasis");
  const dateBasis =
    dateBasisParam === "approvedAt" ||
    dateBasisParam === "createdAt" ||
    dateBasisParam === "checkIn"
      ? (dateBasisParam as BtransDateBasis)
      : undefined;
  const test = url.searchParams.get("test") === "1";

  if (
    (year != null && (year < 2000 || year > 2100)) ||
    (month != null && (month < 1 || month > 12))
  ) {
    return NextResponse.json(
      { ok: false, message: "Geçersiz year/month" },
      { status: 400 }
    );
  }

  const result = await runBtransMonthlyReport({
    year,
    month,
    dateBasis,
    test,
  });

  return NextResponse.json(result);
}
