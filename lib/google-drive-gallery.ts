import { sleep } from "@/lib/tatildeyiz-gallery";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/bmp",
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;

export type GoogleDriveResource = {
  type: "folder" | "file";
  id: string;
};

export type GoogleDriveGalleryResult = {
  urls: string[];
  warnings: string[];
  source: "drive-api" | "embedded-folder" | "file";
};

function driveApiKey(): string {
  return (
    process.env.GOOGLE_DRIVE_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

/** Paylaşım / klasör / dosya URL'sinden Drive kimliği çıkarır. */
export function parseGoogleDriveResource(
  raw: string
): GoogleDriveResource | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
      return { type: "folder", id: value };
    }
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!host.includes("google.com") && !host.includes("googleapis.com")) {
    return null;
  }

  const folderMatch = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) {
    return { type: "folder", id: folderMatch[1] };
  }

  const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) {
    return { type: "file", id: fileMatch[1] };
  }

  const openId = url.searchParams.get("id");
  if (openId && /^[a-zA-Z0-9_-]+$/.test(openId)) {
    if (url.pathname.includes("folders") || url.pathname.includes("folderview")) {
      return { type: "folder", id: openId };
    }
    if (url.pathname.includes("file") || url.pathname.includes("uc")) {
      return { type: "file", id: openId };
    }
    // open?id= çoğu zaman dosya; klasör de olabilir — varsayılan klasör
    return { type: "folder", id: openId };
  }

  const resourceKey = url.searchParams.get("resourcekey");
  void resourceKey;

  return null;
}

export function googleDriveImageDownloadUrl(fileId: string): string {
  // Genel erişime açık görseller için kararlı indirme adresi
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function isImageFile(name: string, mimeType?: string | null): boolean {
  if (mimeType && IMAGE_MIME.has(mimeType.toLowerCase())) return true;
  if (mimeType?.startsWith("image/")) return true;
  return IMAGE_EXT.test(name);
}

function naturalNameSort(a: string, b: string): number {
  return a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" });
}

async function listViaDriveApi(
  folderId: string,
  apiKey: string
): Promise<{ id: string; name: string }[]> {
  const files: { id: string; name: string }[] = [];
  let pageToken = "";

  for (let page = 0; page < 20; page += 1) {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set(
      "q",
      `'${folderId}' in parents and trashed=false`
    );
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType)");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("orderBy", "name_natural");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Google Drive API ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`
      );
    }

    const payload = (await response.json()) as {
      nextPageToken?: string;
      files?: Array<{ id?: string; name?: string; mimeType?: string }>;
    };

    for (const file of payload.files ?? []) {
      if (!file.id || !file.name) continue;
      if (!isImageFile(file.name, file.mimeType)) continue;
      files.push({ id: file.id, name: file.name });
    }

    pageToken = payload.nextPageToken?.trim() || "";
    if (!pageToken) break;
    await sleep(120);
  }

  files.sort((left, right) => naturalNameSort(left.name, right.name));
  return files;
}

async function listViaEmbeddedFolder(
  folderId: string
): Promise<{ id: string; name: string }[]> {
  const url = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Drive klasör sayfası alınamadı (${response.status})`);
  }

  const html = await response.text();
  const found = new Map<string, string>();

  for (const match of html.matchAll(
    /\/file\/d\/([a-zA-Z0-9_-]+)\/(?:view|preview)[^"']*["'][^>]*>([^<]*)</gi
  )) {
    const id = match[1]!;
    const name = match[2]?.replace(/\s+/g, " ").trim() || id;
    if (!found.has(id)) found.set(id, name);
  }

  for (const match of html.matchAll(
    /data-id=["']([a-zA-Z0-9_-]{10,})["'][^>]*>[\s\S]{0,200}?aria-label=["']([^"']+)["']/gi
  )) {
    const id = match[1]!;
    const name = match[2]?.trim() || id;
    if (!found.has(id)) found.set(id, name);
  }

  for (const match of html.matchAll(
    /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/gi
  )) {
    const id = match[1]!;
    if (!found.has(id)) found.set(id, id);
  }

  const files = [...found.entries()]
    .map(([id, name]) => ({ id, name }))
    .filter((file) => isImageFile(file.name) || file.name === file.id);

  // İsim yoksa (yalnızca id) hepsini görsel kabul et; aksi halde uzantı filtresi uygula
  const withExt = files.filter((file) => isImageFile(file.name));
  const resolved = withExt.length > 0 ? withExt : files;

  resolved.sort((left, right) => naturalNameSort(left.name, right.name));
  return resolved;
}

/**
 * Google Drive klasör veya dosya paylaşımından indirme URL listesi üretir.
 * Klasör herkese açık (bağlantıya sahip olanlar) olmalıdır.
 */
export async function listGoogleDriveImageUrls(
  driveUrl: string
): Promise<GoogleDriveGalleryResult> {
  const resource = parseGoogleDriveResource(driveUrl);
  if (!resource) {
    throw new Error(
      "Geçersiz Google Drive bağlantısı. Klasör veya dosya paylaşım linki yapıştırın."
    );
  }

  const warnings: string[] = [];

  if (resource.type === "file") {
    return {
      urls: [googleDriveImageDownloadUrl(resource.id)],
      warnings,
      source: "file",
    };
  }

  const apiKey = driveApiKey();
  let files: { id: string; name: string }[] = [];
  let source: GoogleDriveGalleryResult["source"] = "embedded-folder";

  if (apiKey) {
    try {
      files = await listViaDriveApi(resource.id, apiKey);
      source = "drive-api";
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Drive API başarısız, gömülü klasör denenecek: ${error.message}`
          : "Drive API başarısız, gömülü klasör denenecek"
      );
    }
  } else {
    warnings.push(
      "GOOGLE_DRIVE_API_KEY yok; klasör gömülü görünüm üzerinden okunacak"
    );
  }

  if (files.length === 0) {
    files = await listViaEmbeddedFolder(resource.id);
    source = "embedded-folder";
  }

  if (files.length === 0) {
    throw new Error(
      "Google Drive klasöründe görsel bulunamadı. Klasörü «bağlantıya sahip herkes» paylaşımıyla açın ve görsellerin klasörde olduğundan emin olun."
    );
  }

  return {
    urls: files.map((file) => googleDriveImageDownloadUrl(file.id)),
    warnings,
    source,
  };
}
