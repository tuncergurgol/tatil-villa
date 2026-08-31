import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { processGalleryImageToWebp } from "@/lib/process-gallery-image";
import { sleep } from "@/lib/tatildeyiz-gallery";
import { buildSeoGalleryFileName } from "@/lib/villa-gallery-filename";

const REQUEST_DELAY_MS = 200;

export type VillaGalleryFromUrlsResult = {
  importedCount: number;
  sourceUrlCount: number;
  localUrls: string[];
};

async function downloadImage(url: string) {
  const isDrive =
    /drive\.google\.com|googleusercontent\.com/i.test(url) ||
    /[?&]id=[a-zA-Z0-9_-]+/.test(url);
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: isDrive
        ? "https://drive.google.com/"
        : "https://www.villareyonu.com/",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Görsel indirilemedi (${response.status}): ${url}`);
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(
      `Görsel yerine HTML döndü (paylaşım kapalı olabilir): ${url}`
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function importVillaGalleryFromUrls(
  villaId: string,
  sourceUrls: string[],
  options?: { force?: boolean; delayMs?: number }
): Promise<VillaGalleryFromUrlsResult> {
  const force = options?.force ?? true;
  const delayMs = options?.delayMs ?? REQUEST_DELAY_MS;
  const uniqueUrls = [...new Set(sourceUrls.map((url) => url.trim()).filter(Boolean))];

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, name: true },
  });
  if (!villa) {
    throw new Error("Villa bulunamadı");
  }
  if (uniqueUrls.length === 0) {
    throw new Error("İndirilecek görsel URL'si yok");
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
  for (let index = 0; index < uniqueUrls.length; index += 1) {
    const sourceUrl = uniqueUrls[index]!;
    const sequence = index + 1;
    const fileName = buildSeoGalleryFileName(villa.name, sequence);
    await sleep(delayMs);
    const sourceBuffer = await downloadImage(sourceUrl);
    const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
    await writeFile(path.join(uploadDir, fileName), webpBuffer);
    localUrls.push(`/uploads/villas/${villa.id}/${fileName}`);
  }

  const cover = localUrls[0] ?? "";
  await prisma.villa.update({
    where: { id: villa.id },
    data: {
      image: cover,
      images: localUrls,
    },
  });

  return {
    importedCount: localUrls.length,
    sourceUrlCount: uniqueUrls.length,
    localUrls,
  };
}
