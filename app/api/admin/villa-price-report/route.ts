import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVillaPriceReportExport } from "@/lib/queries/villa-price-report";
import { parseVillaListFilters } from "@/lib/villa-list-filters";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters = parseVillaListFilters(searchParams);
  const result = await generateVillaPriceReportExport(filters);

  return NextResponse.json({ success: true, ...result });
}
