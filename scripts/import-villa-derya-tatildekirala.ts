/**
 * Villa Derya — tatildekirala ilan 45799 galeri import (tam galeri).
 *
 *   npx tsx scripts/import-villa-derya-tatildekirala.ts
 *   npx tsx scripts/import-villa-derya-tatildekirala.ts --dry-run
 */
import { prisma } from "../lib/db";
import { importVillaGalleryFromUrls } from "../lib/external-villa-gallery-import";

const SOURCE_PAGE =
  "https://www.tatildekirala.com/kiralik-villa/kas-islamlarda-doga-ile-ic-ice-ozel-havuzlu-jakuzili-villa-45799";
const TARGET_SLUG = "villa-derya";
const MAX_SEQUENTIAL = 80;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  Referer: "https://www.tatildekirala.com/",
};

type AdvertMedia = {
  file?: { id?: number | null; url?: string | null } | null;
};

function assetUrlFromFileUrl(fileUrl: string, fileId: number): string {
  const match = fileUrl.match(
    /^(https?:\/\/assets\.tatildekirala\.com\/)(.+-)(\d+)(\.(?:jpe?g|png|webp))$/i
  );
  if (match) {
    return `${match[1]}${match[2]}${fileId}${match[4]}`;
  }
  return `https://assets.tatildekirala.com/kas-islamlarda-doga-ile-ic-ice-ozel-havuzlu-jakuzili-villa-${fileId}.jpeg`;
}

async function urlExists(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      headers: {
        ...BROWSER_HEADERS,
        Accept: "image/*,*/*;q=0.8",
      },
    });
    if (head.ok) return true;
    const get = await fetch(url, {
      method: "GET",
      headers: {
        ...BROWSER_HEADERS,
        Accept: "image/*,*/*;q=0.8",
        Range: "bytes=0-0",
      },
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

async function fetchAdvertSeedMedias(pageUrl: string) {
  const response = await fetch(pageUrl, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status})`);
  }
  const html = await response.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
  );
  if (!match?.[1]) {
    throw new Error("__NEXT_DATA__ bulunamadı");
  }
  const data = JSON.parse(match[1]) as {
    props?: {
      pageProps?: {
        advert?: { medias?: AdvertMedia[]; title?: string };
      };
    };
  };
  const medias = data.props?.pageProps?.advert?.medias ?? [];
  return {
    title: data.props?.pageProps?.advert?.title ?? null,
    medias: medias
      .map((item) => ({
        id: Number(item.file?.id ?? NaN),
        url: item.file?.url?.trim() ?? "",
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.url),
  };
}

async function expandSequentialGalleryUrls(
  seed: Array<{ id: number; url: string }>
): Promise<string[]> {
  if (seed.length === 0) return [];
  const first = seed[0]!;
  const urls: string[] = [];
  for (let offset = 0; offset < MAX_SEQUENTIAL; offset += 1) {
    const id = first.id + offset;
    const url = assetUrlFromFileUrl(first.url, id);
    const exists = await urlExists(url);
    if (!exists) break;
    urls.push(url);
  }
  return urls;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const villa = await prisma.villa.findFirst({
    where: { slug: TARGET_SLUG },
    select: { id: true, villaId: true, name: true, slug: true, images: true },
  });
  if (!villa) {
    throw new Error(`Villa bulunamadı: ${TARGET_SLUG}`);
  }

  const { title, medias: seed } = await fetchAdvertSeedMedias(SOURCE_PAGE);
  const urls = await expandSequentialGalleryUrls(seed);
  console.log(
    JSON.stringify(
      {
        sourceTitle: title,
        villa: `${villa.name} (#${villa.villaId})`,
        slug: villa.slug,
        existingImageCount: Array.isArray(villa.images) ? villa.images.length : 0,
        seedCount: seed.length,
        sourceUrlCount: urls.length,
        firstUrl: urls[0] ?? null,
        lastUrl: urls[urls.length - 1] ?? null,
        dryRun,
      },
      null,
      2
    )
  );

  if (urls.length === 0) {
    throw new Error("Kaynak ilanda görsel yok");
  }
  if (dryRun) return;

  const result = await importVillaGalleryFromUrls(villa.id, urls, {
    force: true,
    delayMs: 200,
  });
  console.log(
    JSON.stringify(
      {
        importedCount: result.importedCount,
        cover: result.localUrls[0] ?? null,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
