import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import {
  googleDriveImageDownloadUrl,
  listGoogleDriveImageFiles,
  type GoogleDriveImageFile,
} from "@/lib/google-drive-gallery";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { processGalleryImageToWebp } from "@/lib/process-gallery-image";
import {
  buildSeoGalleryFileName,
  getNextGallerySequence,
} from "@/lib/villa-gallery-filename";
import { appendVillaGalleryUrls } from "@/lib/villa-gallery-upload.server";

const DOWNLOAD_CONCURRENCY = 3;
const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;
const MAX_BATCH = 8;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type DriveGalleryImportFailure = {
  id: string;
  error: string;
};

export type DriveGalleryImportResult = {
  error?: string;
  success?: boolean;
  urls?: string[];
  failed?: DriveGalleryImportFailure[];
};

function normalizeGalleryImages(images: string[], coverImage: string) {
  if (images.length > 0) return images;
  if (coverImage) return [coverImage];
  return [];
}

function looksLikeHtml(buffer: Buffer, contentType: string) {
  if (contentType.includes("text/html")) return true;
  const head = buffer.subarray(0, 64).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const urls = [
    googleDriveImageDownloadUrl(fileId),
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
  ];
  let lastError = "Görsel indirilemedi";

  for (const url of urls) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://drive.google.com/",
      },
      redirect: "follow",
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok) {
      lastError = `Görsel indirilemedi (${response.status})`;
      continue;
    }
    if (looksLikeHtml(buffer, contentType) || buffer.length < 128) {
      lastError =
        "Görsel yerine sayfa döndü. Klasörü «bağlantıya sahip herkes» olarak paylaşın.";
      continue;
    }
    return buffer;
  }

  throw new Error(lastError);
}

export async function listDriveGalleryForVilla(driveUrl: string): Promise<{
  files: GoogleDriveImageFile[];
  warnings: string[];
}> {
  const listed = await listGoogleDriveImageFiles(driveUrl);
  const files = listed.files.filter((file) => FILE_ID_PATTERN.test(file.id));
  if (files.length === 0) {
    throw new Error(
      "Google Drive klasöründe görsel bulunamadı. Klasörü «bağlantıya sahip herkes» paylaşımıyla açın."
    );
  }
  return { files, warnings: listed.warnings };
}

export async function importDriveGalleryFileBatch(
  villaId: string,
  fileIds: string[],
  options?: { startSequence?: number; persist?: boolean }
): Promise<DriveGalleryImportResult> {
  const uniqueIds = [...new Set(fileIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "İndirilecek Drive görseli yok" };
  }
  if (uniqueIds.length > MAX_BATCH) {
    return { error: `Tek seferde en fazla ${MAX_BATCH} görsel alınabilir` };
  }
  if (uniqueIds.some((id) => !FILE_ID_PATTERN.test(id))) {
    return { error: "Geçersiz Drive dosya kimliği" };
  }

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, name: true, images: true, image: true },
  });
  if (!villa) {
    return { error: "Villa bulunamadı" };
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "villas",
    villa.id
  );
  await mkdir(uploadDir, { recursive: true });

  const currentImages = normalizeGalleryImages(villa.images, villa.image);
  let sequence =
    options?.startSequence ?? getNextGallerySequence(currentImages);

  const planned = uniqueIds.map((id) => {
    const fileSequence = sequence;
    sequence += 1;
    return { id, sequence: fileSequence };
  });

  const results = await mapWithConcurrency(
    planned,
    DOWNLOAD_CONCURRENCY,
    async (item) => {
      try {
        const source = await downloadDriveFile(item.id);
        const webpBuffer = await processGalleryImageToWebp(source);
        const fileName = buildSeoGalleryFileName(villa.name, item.sequence);
        await writeFile(path.join(uploadDir, fileName), webpBuffer);
        return {
          url: `/uploads/villas/${villa.id}/${fileName}`,
        };
      } catch (error) {
        return {
          id: item.id,
          error:
            error instanceof Error
              ? error.message
              : "Görsel kaydedilemedi",
        };
      }
    }
  );

  const urls = results.flatMap((item) =>
    "url" in item && item.url ? [item.url] : []
  );
  const failed = results.flatMap((item) =>
    "error" in item && item.error && item.id
      ? [{ id: item.id, error: item.error }]
      : []
  );

  if (urls.length === 0) {
    return {
      error: failed[0]?.error ?? "Drive görselleri kaydedilemedi",
      failed,
    };
  }

  if (options?.persist !== false) {
    const appended = await appendVillaGalleryUrls(villaId, urls);
    if (appended.error) {
      return { error: appended.error, urls, failed };
    }
  }

  return { success: true, urls, failed };
}
