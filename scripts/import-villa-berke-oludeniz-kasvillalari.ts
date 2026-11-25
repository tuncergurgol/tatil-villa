/**
 * Villa Berke Ölüdeniz — kasvillalari.com galeri import.
 *
 *   npx tsx scripts/import-villa-berke-oludeniz-kasvillalari.ts --dry-run
 *   npx tsx scripts/import-villa-berke-oludeniz-kasvillalari.ts
 */
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "../lib/db";
import { processGalleryImageToWebp } from "../lib/process-gallery-image";
import { sleep } from "../lib/tatildeyiz-gallery";
import { buildSeoGalleryFileName } from "../lib/villa-gallery-filename";

const SOURCE_PAGE =
  "https://www.kasvillalari.com/Villa-Berke-Luxury_55.html";
const MEDIA_LOAD_URL = "https://www.kasvillalari.com/Shared/MediaLoad";
const OBJECT_KEY = 4473;
const PICT_TYPE = 26;
const VIDEO_TYPE = 3;
const TARGET_SLUG = "villa-berke-oludeniz";
const REQUEST_DELAY_MS = 250;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: SOURCE_PAGE,
  Origin: "https://www.kasvillalari.com",
};

type MediaPict = { Img?: string };

type MediaLoadResponse = {
  IsSuccess?: boolean;
  Data?: {
    PictsBig?: MediaPict[];
  };
};

function hasManagedGallery(image: string, images: string[]) {
  const all = [image, ...images].filter(Boolean);
  return all.some((url) => url.startsWith("/uploads/villas/"));
}

async function fetchKasvillalariGalleryUrls() {
  const response = await fetch(MEDIA_LOAD_URL, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json, text/plain, */*",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      PictType: PICT_TYPE,
      VideoType: VIDEO_TYPE,
      ObjectKey: OBJECT_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(`MediaLoad başarısız (${response.status})`);
  }

  const payload = (await response.json()) as MediaLoadResponse;
  const urls = (payload.Data?.PictsBig ?? [])
    .map((pict) => pict.Img?.trim() ?? "")
    .filter((url) => /^https?:\/\//i.test(url));

  return [...new Set(urls)];
}

async function downloadImage(url: string) {
  const response = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Görsel indirilemedi (${response.status}): ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force") || !process.argv.includes("--keep");

  const villa = await prisma.villa.findUnique({
    where: { slug: TARGET_SLUG },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      image: true,
      images: true,
    },
  });

  if (!villa) {
    throw new Error(`Villa bulunamadı: ${TARGET_SLUG}`);
  }

  if (!force && hasManagedGallery(villa.image, villa.images)) {
    throw new Error(
      "Yerel galeri zaten mevcut. Üzerine yazmak için --force kullanın."
    );
  }

  console.log(
    `Hedef: ${villa.villaId ?? "-"} ${villa.name} (${villa.slug}) ${villa.id}`
  );
  console.log(`Kaynak: ${SOURCE_PAGE}`);

  const sourceUrls = await fetchKasvillalariGalleryUrls();
  console.log(`Kaynak görsel: ${sourceUrls.length}`);

  if (sourceUrls.length === 0) {
    throw new Error("kasvillalari.com galerisinde görsel bulunamadı");
  }

  if (dryRun) {
    for (const [index, url] of sourceUrls.entries()) {
      console.log(`${index + 1}. ${url}`);
    }
    return;
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "villas",
    villa.id
  );

  if (force) {
    await rm(uploadDir, { recursive: true, force: true });
  }
  await mkdir(uploadDir, { recursive: true });

  const localUrls: string[] = [];

  for (let index = 0; index < sourceUrls.length; index += 1) {
    const sourceUrl = sourceUrls[index]!;
    const sequence = index + 1;
    const fileName = buildSeoGalleryFileName(villa.name, sequence);
    const outputPath = path.join(uploadDir, fileName);

    await sleep(REQUEST_DELAY_MS);
    const sourceBuffer = await downloadImage(sourceUrl);
    const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
    await writeFile(outputPath, webpBuffer);

    const localUrl = `/uploads/villas/${villa.id}/${fileName}`;
    localUrls.push(localUrl);
    console.log(
      `[${sequence}/${sourceUrls.length}] ${fileName} (${Math.round(webpBuffer.length / 1024)} KB)`
    );
  }

  await prisma.villa.update({
    where: { id: villa.id },
    data: {
      image: localUrls[0] ?? "",
      images: localUrls,
    },
  });

  console.log(`Tamam: ${localUrls.length} görsel yazıldı`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
