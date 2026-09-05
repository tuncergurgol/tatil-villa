/**
 * Villa Elmadibi 2 — tatildekirala ilan 45863 galeri import.
 *
 *   npx tsx scripts/import-villa-elmadibi-2-tatildekirala.ts
 *   npx tsx scripts/import-villa-elmadibi-2-tatildekirala.ts --dry-run
 */
import { prisma } from "../lib/db";
import { importVillaGalleryFromUrls } from "../lib/external-villa-gallery-import";

const SOURCE_PAGE =
  "https://www.tatildekirala.com/kiralik-villa/seydikemer-gerisburnunda-modern-tasarimli-ozel-havuzlu-ikiz-villa-45863";
const TARGET_SLUG = "villa-elmadibi-2";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  Referer: "https://www.tatildekirala.com/",
};

type AdvertMedia = {
  file?: { url?: string | null } | null;
};

async function fetchAdvertImageUrls(pageUrl: string): Promise<string[]> {
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
        advert?: { medias?: AdvertMedia[] };
      };
    };
  };
  const medias = data.props?.pageProps?.advert?.medias ?? [];
  const urls = medias
    .map((item) => item.file?.url?.trim() ?? "")
    .filter((url) => /^https?:\/\//i.test(url));
  return [...new Set(urls)];
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

  const urls = await fetchAdvertImageUrls(SOURCE_PAGE);
  console.log(
    JSON.stringify(
      {
        villa: `${villa.name} (#${villa.villaId})`,
        slug: villa.slug,
        existingImageCount: Array.isArray(villa.images) ? villa.images.length : 0,
        sourceUrlCount: urls.length,
        urls,
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
    delayMs: 250,
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
