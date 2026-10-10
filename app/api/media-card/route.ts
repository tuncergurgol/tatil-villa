import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WIDTHS = new Set([280, 384, 560]);
const UPLOAD_ROOT = path.resolve(process.cwd(), "public", "uploads");
const CACHE_ROOT = path.resolve(process.cwd(), "data", "card-image-cache");

function uploadFile(src: string): string | null {
  if (!src.startsWith("/uploads/") || src.includes("..") || src.includes("\\")) {
    return null;
  }
  const relative = src.slice("/uploads/".length);
  if (!relative || relative.endsWith(".svg")) return null;
  const file = path.resolve(UPLOAD_ROOT, relative);
  if (!file.startsWith(UPLOAD_ROOT + path.sep) || !existsSync(file)) return null;
  return file;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src")?.trim() ?? "";
  const width = Number(url.searchParams.get("w") ?? "");
  if (!WIDTHS.has(width)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const file = uploadFile(src);
  if (!file) return new NextResponse("Not found", { status: 404 });

  try {
    const stamp = statSync(file).mtimeMs;
    const hash = createHash("sha1")
      .update(`${src}|${width}|${stamp}`)
      .digest("hex");
    mkdirSync(CACHE_ROOT, { recursive: true });
    const cached = path.join(CACHE_ROOT, `${hash}.webp`);
    if (!existsSync(cached)) {
      await sharp(file)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 62 })
        .toFile(cached);
    }
    const body = readFileSync(cached);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    const body = readFileSync(file);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
