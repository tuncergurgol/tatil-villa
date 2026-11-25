import { NextResponse } from "next/server";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import {
  searchYolcu360Locations,
  getYolcu360Location,
} from "@/lib/yolcu360/client";
import { yolcu360JsonError } from "@/lib/yolcu360/api-helpers";

export async function GET(request: Request) {
  try {
    const settings = await getYolcu360Settings();
    if (!settings.enabled || !settings.publicEnabled) {
      return NextResponse.json({ error: "Servis kullanılamıyor" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? "";
    const placeId = searchParams.get("placeId");

    if (placeId) {
      const detail = await getYolcu360Location(placeId);
      return NextResponse.json(detail);
    }

    const results = await searchYolcu360Locations(query);
    return NextResponse.json(results);
  } catch (error) {
    return yolcu360JsonError(error, "Konum araması başarısız");
  }
}
