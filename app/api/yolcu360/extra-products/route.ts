import { NextResponse } from "next/server";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { getYolcu360ExtraProducts } from "@/lib/yolcu360/client";
import { yolcu360JsonError } from "@/lib/yolcu360/api-helpers";

export async function GET(request: Request) {
  try {
    const settings = await getYolcu360Settings();
    if (!settings.enabled || !settings.publicEnabled) {
      return NextResponse.json({ error: "Servis kullanılamıyor" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const searchID = searchParams.get("searchID");
    const code = searchParams.get("code");
    if (!searchID || !code) {
      return NextResponse.json({ error: "searchID ve code gerekli" }, { status: 400 });
    }

    const extras = await getYolcu360ExtraProducts(searchID, code);
    return NextResponse.json(extras);
  } catch (error) {
    return yolcu360JsonError(error, "Ek ürünler alınamadı");
  }
}
