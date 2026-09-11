import { NextResponse } from "next/server";
import { fetchOtelzPlaceSuggestions } from "@/lib/otelz-places";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = (searchParams.get("q") ?? searchParams.get("term") ?? "").trim();

  if (term.length < 2) {
    return NextResponse.json([]);
  }

  if (term.length > 80) {
    return NextResponse.json({ error: "Arama terimi çok uzun" }, { status: 400 });
  }

  try {
    const suggestions = await fetchOtelzPlaceSuggestions(term);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("[otelz-suggestions]", error);
    return NextResponse.json(
      { error: "Otelz önerileri alınamadı" },
      { status: 502 }
    );
  }
}
