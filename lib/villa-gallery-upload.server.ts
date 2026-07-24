import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { processGalleryImageToWebp } from "@/lib/process-gallery-image";
import {
  buildSeoGalleryFileName,
  getNextGallerySequence,
} from "@/lib/villa-gallery-filename";
import { revalidateVillaGallery } from "@/lib/villa-gallery-revalidate.server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 4;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type VillaGalleryUploadResult = {
  error?: string;
  success?: boolean;
  urls?: string[];
};

function normalizeGalleryImages(images: string[], coverImage: string) {
  if (images.length > 0) return images;
  if (coverImage) return [coverImage];
  return [];
}

async function persistGalleryOrder(villaId: string, orderedUrls: string[]) {
  const cover = orderedUrls[0] ?? "";

  await prisma.villa.update({
    where: { id: villaId },
    data: {
      images: orderedUrls,
      image: cover,
    },
  });
}

export async function uploadVillaGalleryFiles(
  villaId: string,
  files: File[]
): Promise<VillaGalleryUploadResult> {
  const validFiles = files.filter((file) => file.size > 0);

  if (validFiles.length === 0) {
    return { error: "Yüklenecek dosya seçilmedi" };
  }

  try {
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
      select: { id: true, name: true, slug: true, images: true, image: true },
    });

    if (!villa) {
      return { error: "Villa bulunamadı" };
    }

    const currentImages = normalizeGalleryImages(villa.images, villa.image);
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "villas",
      villaId
    );
    await mkdir(uploadDir, { recursive: true });

    let sequence = getNextGallerySequence(currentImages);

    type PreparedFile = {
      file: File;
      sequence: number;
    };

    const prepared: PreparedFile[] = [];
    for (const file of validFiles) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return {
          error: "Yalnızca JPG, PNG ve WEBP dosyaları yüklenebilir",
        };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { error: "Dosya boyutu 10 MB'dan küçük olmalıdır" };
      }
      prepared.push({ file, sequence });
      sequence += 1;
    }

    const uploadedUrls = await mapWithConcurrency(
      prepared,
      UPLOAD_CONCURRENCY,
      async ({ file, sequence: fileSequence }) => {
        const fileName = buildSeoGalleryFileName(villa.name, fileSequence);
        const outputPath = path.join(uploadDir, fileName);
        const sourceBuffer = Buffer.from(await file.arrayBuffer());
        const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
        await writeFile(outputPath, webpBuffer);
        return `/uploads/villas/${villaId}/${fileName}`;
      }
    );

    const nextImages = [...currentImages, ...uploadedUrls];
    await persistGalleryOrder(villaId, nextImages);
    await revalidateVillaGallery(villaId, villa.slug);

    return { success: true, urls: uploadedUrls };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Görseller yüklenirken bir hata oluştu";
    return { error: message };
  }
}
