import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVillaTakvimDetailData } from "@/lib/queries/villa-takvim";
import { villaTakvimRouteParam } from "@/lib/villa-takvim-path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const villaParam = request.nextUrl.searchParams.get("villa")?.trim() ?? "";
  if (!villaParam) {
    return NextResponse.json({ error: "Villa parametresi gerekli" }, { status: 400 });
  }

  const detail = await getVillaTakvimDetailData(villaParam);
  if (!detail) {
    return NextResponse.json({ error: "Villa bulunamadı" }, { status: 404 });
  }

  const canonical = villaTakvimRouteParam(detail.villa);
  if (villaParam !== canonical) {
    return NextResponse.json({
      redirectTo: `/admin/konaklama/takvim?villa=${encodeURIComponent(canonical)}`,
    });
  }

  return NextResponse.json({
    selected: {
      villa: detail.villa,
      periods: detail.periods.map((period) => ({
        ...period,
        startDate:
          period.startDate instanceof Date
            ? period.startDate.toISOString()
            : period.startDate,
        endDate:
          period.endDate instanceof Date
            ? period.endDate.toISOString()
            : period.endDate,
      })),
      periodDays: detail.periodDays.map((day) => ({
        ...day,
        date: day.date instanceof Date ? day.date.toISOString() : day.date,
      })),
    },
  });
}
