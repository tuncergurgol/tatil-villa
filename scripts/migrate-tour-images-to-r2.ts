/**
 * Tur görsellerini (cover + TourImage + descriptionHtml) R2'ye taşır.
 *
 *   npx tsx scripts/migrate-tour-images-to-r2.ts --dry-run
 *   npx tsx scripts/migrate-tour-images-to-r2.ts
 *
 * Gerekli env:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   R2_PUBLIC_BASE_URL (varsayılan: https://r2.tatildeyiz.com.tr)
 *   R2_TOUR_SITE_PREFIX (varsayılan: balayivillacisi.com)
 */
import { PrismaClient } from "@prisma/client";
import {
  buildR2PublicUrl,
  buildTourImageObjectKey,
  fileNameFromUrl,
  getR2ConfigFromEnv,
  guessContentType,
  isR2PublicUrl,
  requireR2ConfigFromEnv,
  uploadBufferToR2,
} from "../lib/r2-storage";

const prisma = new PrismaClient();

const dryRun = process.argv.includes("--dry-run");
const sitePrefix = process.env.R2_TOUR_SITE_PREFIX?.trim() || "balayivillacisi.com";

const EXTERNAL_HOSTS = new Set([
  "storage.fluxesoft.com",
  "r2.fluxesoft.com",
  "images.unsplash.com",
]);

function shouldMigrateUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("/uploads/")) return false;
  if (isR2PublicUrl(trimmed)) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return EXTERNAL_HOSTS.has(host) || host.includes("fluxesoft");
  } catch {
    return false;
  }
}

function collectUrlsFromHtml(html: string) {
  const urls = new Set<string>();
  const re = /https?:\/\/[^\s"'<>]+?\.(?:webp|jpg|jpeg|png|gif)/gi;
  for (const match of html.matchAll(re)) {
    if (shouldMigrateUrl(match[0])) urls.add(match[0]);
  }
  return [...urls];
}

async function downloadImage(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TatildeyizTourImageMigrator/1.0)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`İndirme başarısız (${res.status}): ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`Boş dosya: ${url}`);
  }
  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    guessContentType(fileNameFromUrl(url));
  return { buffer, contentType };
}

async function main() {
  const config = dryRun ? getR2ConfigFromEnv() : requireR2ConfigFromEnv();
  if (dryRun && !config) {
    console.log("DRY-RUN: R2 env yok; yalnızca URL listesi üretilecek.");
  }

  const tours = await prisma.tour.findMany({
    include: {
      images: true,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const urlMap = new Map<string, string>();
  const pending = new Set<string>();

  for (const tour of tours) {
    if (tour.coverImage && shouldMigrateUrl(tour.coverImage)) {
      pending.add(tour.coverImage);
    }
    for (const image of tour.images) {
      if (shouldMigrateUrl(image.url)) pending.add(image.url);
    }
    for (const url of collectUrlsFromHtml(tour.descriptionHtml)) {
      pending.add(url);
    }
  }

  console.log(`Tur sayısı: ${tours.length}`);
  console.log(`Taşınacak benzersiz görsel: ${pending.size}`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourceUrl of pending) {
    if (urlMap.has(sourceUrl)) continue;

    const fileName = fileNameFromUrl(sourceUrl);
    const objectKey = buildTourImageObjectKey(fileName, sitePrefix);
    const targetUrl = config
      ? buildR2PublicUrl(config, objectKey)
      : `https://r2.tatildeyiz.com.tr/${objectKey}`;

    if (dryRun) {
      console.log(`[dry-run] ${sourceUrl} -> ${targetUrl}`);
      urlMap.set(sourceUrl, targetUrl);
      continue;
    }

    try {
      const { buffer, contentType } = await downloadImage(sourceUrl);
      const publicUrl = await uploadBufferToR2({
        config: config!,
        objectKey,
        body: buffer,
        contentType,
      });
      urlMap.set(sourceUrl, publicUrl);
      uploaded += 1;
      console.log(`OK ${uploaded}/${pending.size} ${fileName}`);
    } catch (error) {
      failed += 1;
      console.error(
        `HATA: ${sourceUrl}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (dryRun) {
    console.log(`DRY-RUN tamamlandı. ${urlMap.size} URL eşlemesi hazır.`);
    await prisma.$disconnect();
    return;
  }

  let tourUpdates = 0;
  let imageUpdates = 0;

  for (const tour of tours) {
    const coverImage = tour.coverImage
      ? urlMap.get(tour.coverImage) ?? tour.coverImage
      : tour.coverImage;

    let descriptionHtml = tour.descriptionHtml;
    for (const [from, to] of urlMap) {
      if (descriptionHtml.includes(from)) {
        descriptionHtml = descriptionHtml.split(from).join(to);
      }
    }

    const coverChanged = coverImage !== tour.coverImage;
    const htmlChanged = descriptionHtml !== tour.descriptionHtml;

    if (coverChanged || htmlChanged) {
      await prisma.tour.update({
        where: { id: tour.id },
        data: {
          ...(coverChanged ? { coverImage } : {}),
          ...(htmlChanged ? { descriptionHtml } : {}),
        },
      });
      tourUpdates += 1;
    }

    for (const image of tour.images) {
      const nextUrl = urlMap.get(image.url);
      if (!nextUrl || nextUrl === image.url) {
        skipped += 1;
        continue;
      }
      await prisma.tourImage.update({
        where: { id: image.id },
        data: { url: nextUrl },
      });
      imageUpdates += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        uploaded,
        failed,
        tourUpdates,
        imageUpdates,
        mappedUrls: urlMap.size,
        publicBase: config?.publicBaseUrl,
        sitePrefix,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
