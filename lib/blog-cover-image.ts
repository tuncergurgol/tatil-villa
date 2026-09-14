import { mkdir, writeFile } from "fs/promises";
import path from "path";

/** Ücretsiz tatil/villa kapak görselleri (Unsplash, ticari kullanım uygun). */
const BLOG_COVER_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=630&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=630&fit=crop&q=80",
] as const;

function hashSlug(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash + value.charCodeAt(index) * (index + 1)) % 2147483647;
  }
  return Math.abs(hash);
}

export function pickBlogCoverImageUrl(slug: string) {
  const index = hashSlug(slug) % BLOG_COVER_IMAGE_POOL.length;
  return BLOG_COVER_IMAGE_POOL[index]!;
}

export async function downloadBlogCoverImage(slug: string): Promise<string> {
  const remoteUrl = pickBlogCoverImageUrl(slug);

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) return remoteUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads", "blog-ai");
    await mkdir(dir, { recursive: true });
    const filename = `${slug}-${Date.now()}.jpg`;
    await writeFile(path.join(dir, filename), buffer);
    return `/uploads/blog-ai/${filename}`;
  } catch {
    return remoteUrl;
  }
}
