import { NextRequest, NextResponse } from "next/server";
import { searchActiveVillasByName } from "@/lib/queries/villa-name-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchActiveVillasByName(q, 12);
  return NextResponse.json({ results });
}
