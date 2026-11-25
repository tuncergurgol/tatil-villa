import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  searchInstagramStoryCategories,
  searchInstagramStoryRegions,
  searchInstagramStoryVillas,
} from "@/lib/queries/instagram-story";
import { INSTAGRAM_STORY_MODES } from "@/lib/instagram-story/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const modeParam = request.nextUrl.searchParams.get("mode")?.trim() ?? "villa";
  const mode = INSTAGRAM_STORY_MODES.includes(
    modeParam as (typeof INSTAGRAM_STORY_MODES)[number]
  )
    ? (modeParam as (typeof INSTAGRAM_STORY_MODES)[number])
    : "villa";

  if (mode === "category") {
    const categories = await searchInstagramStoryCategories(q, 20);
    return NextResponse.json({ hits: categories, villas: categories });
  }

  if (mode === "region") {
    if (q.length < 1) {
      return NextResponse.json({ hits: [], villas: [] });
    }
    const regions = await searchInstagramStoryRegions(q, 16);
    return NextResponse.json({ hits: regions, villas: regions });
  }

  if (q.length < 1) {
    return NextResponse.json({ hits: [], villas: [] });
  }

  const villas = await searchInstagramStoryVillas(q, 12);
  return NextResponse.json({ hits: villas, villas });
}
