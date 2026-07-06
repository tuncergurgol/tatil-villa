import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMonthlyListingReportData } from "@/lib/queries/monthly-listing-report";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }

  const data = await getMonthlyListingReportData(year, month);
  return NextResponse.json(data);
}
