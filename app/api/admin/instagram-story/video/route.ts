import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import path from "node:path";
import { auth } from "@/auth";
import { generateInstagramStoryVideoBuffer } from "@/lib/instagram-story/generate";
import { PUBLIC_SITE_KEYS } from "@/lib/public-site-keys";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MUSIC_BYTES = 15 * 1024 * 1024;

const bodySchema = z.object({
  villaId: z.string().min(1),
  imageUrls: z.array(z.string().min(1)).min(1).max(8),
  siteKey: z.enum(PUBLIC_SITE_KEYS).optional(),
  tagline: z.string().max(80).optional(),
  meta: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  ctaLabel: z.string().max(80).optional(),
  secondsPerSlide: z.coerce.number().min(2).max(8).optional(),
  musicVolume: z.coerce.number().min(0.05).max(1).optional(),
});

function parseImageUrls(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse({
    villaId: form.get("villaId"),
    imageUrls: parseImageUrls(form.get("imageUrls")),
    siteKey: form.get("siteKey") || undefined,
    tagline: form.get("tagline") || undefined,
    meta: form.get("meta") || undefined,
    location: form.get("location") || undefined,
    ctaLabel: form.get("ctaLabel") || undefined,
    secondsPerSlide: form.get("secondsPerSlide") || undefined,
    musicVolume: form.get("musicVolume") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
      { status: 400 }
    );
  }

  let musicBuffer: Buffer | null = null;
  let musicExt = ".mp3";
  const musicEntry = form.get("music");
  if (musicEntry instanceof File && musicEntry.size > 0) {
    if (musicEntry.size > MAX_MUSIC_BYTES) {
      return NextResponse.json(
        { error: "Müzik dosyası en fazla 15 MB olabilir" },
        { status: 400 }
      );
    }
    const type = musicEntry.type || "";
    if (
      type &&
      !type.startsWith("audio/") &&
      type !== "application/octet-stream"
    ) {
      return NextResponse.json(
        { error: "Yalnızca ses dosyası yükleyin (mp3, m4a, wav)" },
        { status: 400 }
      );
    }
    musicExt = path.extname(musicEntry.name || "").toLowerCase() || ".mp3";
    musicBuffer = Buffer.from(await musicEntry.arrayBuffer());
  }

  try {
    const result = await generateInstagramStoryVideoBuffer({
      ...parsed.data,
      musicBuffer,
      musicExt,
      musicVolume: parsed.data.musicVolume,
    });
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
