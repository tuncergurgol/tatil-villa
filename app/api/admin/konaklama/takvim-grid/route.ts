import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getVillaTakvimGridPage,
  type TakvimGridStatus,
} from "@/lib/queries/villa-takvim";

export const dynamic = "force-dynamic";

function parseStatus(value: string | null): TakvimGridStatus {
  if (value === "active" || value === "passive") return value;
  return "all";
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const status = parseStatus(params.get("status"));
  const q = params.get("q") ?? "";

  const data = await getVillaTakvimGridPage({
    page: Number.isFinite(page) ? page : 1,
    pageSize: 18,
    status,
    q,
  });

  return NextResponse.json(data);
}
