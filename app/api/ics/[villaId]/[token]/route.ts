import { NextResponse } from "next/server";
import { generateVillaIcalFeed } from "@/lib/villa-ical-export-service";

export const dynamic = "force-dynamic";

function normalizeToken(raw: string) {
  return raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ villaId: string; token: string }> }
) {
  const { villaId, token: rawToken } = await context.params;
  const token = normalizeToken(rawToken);

  const feed = await generateVillaIcalFeed(villaId, token);
  if (!feed) {
    return NextResponse.json({ error: "Takvim bulunamadı" }, { status: 404 });
  }

  return new NextResponse(feed.body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${feed.villa.villaId || villaId}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
