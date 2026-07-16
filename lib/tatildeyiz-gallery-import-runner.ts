import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { processGalleryImageToWebp } from "@/lib/process-gallery-image";
import {
  fetchTatildeyizGalleryUrls,
  sleep,
} from "@/lib/tatildeyiz-gallery";
import {
  assertTatildeyizVillaSource,
  mapTatildeyizFetchError,
} from "@/lib/tatildeyiz-villa-source";
import { buildSeoGalleryFileName } from "@/lib/villa-gallery-filename";

const REQUEST_DELAY_MS = 300;

export type VillaGalleryImportResult = {
  importedCount: number;
  sourceUrlCount: number;
  localUrls: string[];
};

function hasManagedGallery(image: string, images: string[]) {
  const all = [image, ...images].filter(Boolean);
  return all.some((url) => url.startsWith("/uploads/villas/"));
}

async function downloadImage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TatilVillaImageImport/1.0)",
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Görsel indirilemedi (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Tatildeyiz villa sayfasından galeri görsellerini indirip yerel galeriye yazar.
 * Mevcut `scripts/import-villa-images-from-tatildeyiz.ts` ile aynı pipeline.
 * force=true: mevcut /uploads/villas/{id} klasörünü silip üzerine yazar.
 */
export async function importVillaGalleryFromTatildeyiz(
  villaId: string,
  options: {
    siteName: string;
    force?: boolean;
    delayMs?: number;
    dryRun?: boolean;
  }
): Promise<VillaGalleryImportResult> {
  const force = options.force ?? true;
  const dryRun = options.dryRun ?? false;
  const delayMs = options.delayMs ?? REQUEST_DELAY_MS;

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      name: true,
      slug: true,
      villaId: true,
      image: true,
      images: true,
    },
  });

  if (!villa) {
    throw new Error("Villa bulunamadı");
  }

  assertTatildeyizVillaSource(villa);

  if (!force && hasManagedGallery(villa.image, villa.images)) {
    throw new Error(
      "Yerel galeri zaten mevcut. Üzerine yazmak için onay gerekir."
    );
  }

  await sleep(delayMs);
  let sourceUrls: string[];
  try {
    sourceUrls = await fetchTatildeyizGalleryUrls(villa.slug);
  } catch (error) {
    throw mapTatildeyizFetchError(error, villa.slug);
  }

  if (sourceUrls.length === 0) {
    throw new Error("Tatildeyiz'den görsel bulunamadı");
  }

  if (dryRun) {
    return {
      importedCount: sourceUrls.length,
      sourceUrlCount: sourceUrls.length,
      localUrls: [],
    };
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
    const fileName = buildSeoGalleryFileName(
      options.siteName,
      villa.name,
      sequence
    );
    const outputPath = path.join(uploadDir, fileName);

    await sleep(delayMs);
    const sourceBuffer = await downloadImage(sourceUrl);
    const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
    await writeFile(outputPath, webpBuffer);

    localUrls.push(`/uploads/villas/${villa.id}/${fileName}`);
  }

  await prisma.villa.update({
    where: { id: villa.id },
    data: {
      image: localUrls[0] ?? "",
      images: localUrls,
    },
  });

  return {
    importedCount: localUrls.length,
    sourceUrlCount: sourceUrls.length,
    localUrls,
  };
}
