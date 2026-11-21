import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchVillaTakvimOptions } from "@/lib/queries/villa-takvim";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ villas: [] });
  }

  const villas = await searchVillaTakvimOptions(q, 12);
  return NextResponse.json({ villas });
}
