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
import { archiveGalleryFilesToDrive } from "@/lib/google-drive-archive.server";
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
  archiveWarning?: string;
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

function storeCookies(jar: Map<string, string>, response: Response) {
  const lines =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  for (const line of lines) {
    const pair = line.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function confirmDownloadUrl(html: string) {
  const action = html.match(/<form[^>]+action="([^"]+)"/i)?.[1];
  if (action) {
    const url = new URL(action.replace(/&amp;/g, "&"), "https://drive.google.com");
    for (const field of ["id", "export", "confirm", "uuid"]) {
      const value = html.match(
        new RegExp(`name="${field}"\\s+value="([^"]*)"`, "i")
      )?.[1];
      if (value) url.searchParams.set(field, value.replace(/&amp;/g, "&"));
    }
    if (!url.searchParams.get("export")) url.searchParams.set("export", "download");
    return url.toString();
  }

  const href = html.match(
    /href="((?:https:\/\/drive\.usercontent\.google\.com)?\/download\?[^"]+|\/uc\?[^"]*confirm=[^"]+)"/i
  )?.[1];
  if (!href) return null;
  return new URL(href.replace(/&amp;/g, "&"), "https://drive.google.com").toString();
}

async function fetchDrive(
  url: string,
  jar: Map<string, string>,
  redirects = 0
): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://drive.google.com/",
      ...(jar.size > 0 ? { Cookie: cookieHeader(jar) } : {}),
    },
    redirect: "manual",
    cache: "no-store",
  });
  storeCookies(jar, response);
  if (
    redirects < 5 &&
    response.status >= 300 &&
    response.status < 400
  ) {
    const location = response.headers.get("location");
    if (location) {
      return fetchDrive(new URL(location, url).toString(), jar, redirects + 1);
    }
  }
  return response;
}

async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const jar = new Map<string, string>();
  const urls = [
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w2400`,
    googleDriveImageDownloadUrl(fileId),
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
  ];
  let lastError = "Görsel indirilemedi";

  for (const startUrl of urls) {
    let response = await fetchDrive(startUrl, jar);
    let contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    let buffer = Buffer.from(await response.arrayBuffer());

    if (response.ok && looksLikeHtml(buffer, contentType)) {
      const nextUrl = confirmDownloadUrl(buffer.toString("utf8"));
      if (nextUrl) {
        response = await fetchDrive(nextUrl, jar);
        contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
        buffer = Buffer.from(await response.arrayBuffer());
      }
    }

    if (!response.ok) {
      lastError = `Görsel indirilemedi (${response.status})`;
      continue;
    }
    if (looksLikeHtml(buffer, contentType) || buffer.length < 128) {
      const text = buffer.toString("utf8");
      lastError = /permission to download|hasn&#39;t given you permission|indirme izni/i.test(
        text
      )
        ? "Dosyanın indirilmesine izin verilmemiş. Klasörü «bağlantıya sahip herkes» olarak paylaşın."
        : "Görsel yerine sayfa döndü. Klasörü «bağlantıya sahip herkes» olarak paylaşın.";
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
          archive: { fileName, buffer: webpBuffer },
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

  const archived = await archiveGalleryFilesToDrive(
    villa.name,
    results.flatMap((item) =>
      "archive" in item && item.archive ? [item.archive] : []
    )
  );

  if (options?.persist !== false) {
    const appended = await appendVillaGalleryUrls(villaId, urls);
    if (appended.error) {
      return { error: appended.error, urls, failed, archiveWarning: archived.warning };
    }
  }

  return { success: true, urls, failed, archiveWarning: archived.warning };
}
