/** Tarayıcıda galeri yüklemesinden önce boyut düşürme — sunucu yükünü azaltır. */
export const CLIENT_GALLERY_MAX_EDGE = 1280;
export const CLIENT_GALLERY_JPEG_QUALITY = 0.82;
const PREPROCESS_CONCURRENCY = 10;

async function preprocessOne(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 160_000 && file.type === "image/webp") return file;

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale =
      longest > CLIENT_GALLERY_MAX_EDGE
        ? CLIENT_GALLERY_MAX_EDGE / longest
        : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", CLIENT_GALLERY_JPEG_QUALITY);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "gorsel";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

export async function preprocessGalleryImageFiles(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<File[]> {
  if (files.length === 0) return [];

  const results = new Array<File>(files.length);
  let nextIndex = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= files.length) return;

      results[index] = await preprocessOne(files[index]!);
      done += 1;
      onProgress?.(done, files.length);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(PREPROCESS_CONCURRENCY, files.length) },
      () => worker()
    )
  );

  return results;
}

export function estimateUploadBytes(files: File[]) {
  return files.reduce((sum, file) => sum + file.size, 0);
}
