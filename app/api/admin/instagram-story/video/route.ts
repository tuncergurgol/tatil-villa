import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateInstagramStoryVideoBuffer } from "@/lib/instagram-story/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  villaId: z.string().min(1),
  imageUrls: z.array(z.string().min(1)).min(1).max(8),
  tagline: z.string().max(80).optional(),
  meta: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  ctaLabel: z.string().max(80).optional(),
  secondsPerSlide: z.coerce.number().min(2).max(8).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
      { status: 400 }
    );
  }

  try {
    const result = await generateInstagramStoryVideoBuffer(parsed.data);
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(result.buffer.length),
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Story videosu üretilemedi",
      },
      { status: 500 }
    );
  }
}
