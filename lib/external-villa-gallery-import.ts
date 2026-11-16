import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { processGalleryImageToWebp } from "@/lib/process-gallery-image";
import { sleep } from "@/lib/tatildeyiz-gallery";
import { buildSeoGalleryFileName } from "@/lib/villa-gallery-filename";

const REQUEST_DELAY_MS = 40;
const GALLERY_CONCURRENCY = 4;

export type VillaGalleryFromUrlsResult = {
  importedCount: number;
  sourceUrlCount: number;
  localUrls: string[];
  failedCount: number;
};

async function downloadImage(url: string) {
  const isDrive =
    /drive\.google\.com|googleusercontent\.com/i.test(url) ||
    /[?&]id=[a-zA-Z0-9_-]+/.test(url);
  const isTatildekirala = /tatildekirala\.com/i.test(url);
  const isVilladenizi =
    /villadenizi\.com|plato-static\.s3|macrovilla\.com/i.test(url);
  const isKastavillam = /kastavillam\.com/i.test(url);
  const isTatilox = /tatilox\.com/i.test(url);
  const isTurizmplus = /myvillacity|turizmplus\.com/i.test(url);
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: isDrive
        ? "https://drive.google.com/"
        : isTatildekirala
          ? "https://www.tatildekirala.com/"
          : isVilladenizi
            ? "https://www.villadenizi.com.tr/"
            : isKastavillam
              ? "https://www.kastavillam.com/"
              : isTatilox
                ? "https://www.tatilox.com/"
                : isTurizmplus
                  ? "https://www.myvillacity.com/"
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

  const localUrls = new Array<string>(uniqueUrls.length);
  let failedCount = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < uniqueUrls.length) {
      const index = cursor;
      cursor += 1;
      const sourceUrl = uniqueUrls[index]!;
      const fileName = buildSeoGalleryFileName(villa.name, index + 1);
      try {
        if (delayMs > 0) await sleep(delayMs);
        const sourceBuffer = await downloadImage(sourceUrl);
        const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
        await writeFile(path.join(uploadDir, fileName), webpBuffer);
        localUrls[index] = `/uploads/villas/${villa.id}/${fileName}`;
      } catch {
        failedCount += 1;
      }
    }
  }

  const workers = Math.min(GALLERY_CONCURRENCY, uniqueUrls.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));

  const saved = localUrls.filter((url) => Boolean(url));
  if (saved.length === 0) {
    throw new Error("Görseller indirilemedi");
  }

  await prisma.villa.update({
    where: { id: villa.id },
    data: {
      image: saved[0] ?? "",
      images: saved,
    },
  });

  return {
    importedCount: saved.length,
    sourceUrlCount: uniqueUrls.length,
    localUrls: saved,
    failedCount,
  };
}
