"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { processGalleryImageToWebp } from "@/lib/process-gallery-image";
import { importVillaGalleryFromTatildeyiz } from "@/lib/tatildeyiz-gallery-import-runner";
import {
  buildSeoGalleryFileName,
  getNextGallerySequence,
} from "@/lib/villa-gallery-filename";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type VillaGalleryActionState = {
  error?: string;
  success?: boolean;
  urls?: string[];
};

async function revalidateVillaGallery(villaId: string, slug?: string) {
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(villaId);
  if (slug) {
    revalidatePath(`/villalar/${slug}`);
  }
  revalidatePath("/villalar");
}

function getSiteName(brandName: string, agencyName: string) {
  const brand = brandName.replace(/^www\./, "").trim();
  if (brand) {
    return brand.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
  }
  return agencyName.trim() || "Tatildeyiz";
}

async function getVillaGalleryContext(villaId: string) {
  const [villa, settings] = await Promise.all([
    prisma.villa.findUnique({
      where: { id: villaId },
      select: { id: true, name: true, slug: true, images: true, image: true },
    }),
    getCompanySettings(),
  ]);

  if (!villa) {
    throw new Error("Villa bulunamadı");
  }

  return {
    villa,
    siteName: getSiteName(settings.brandName, settings.agencyName),
  };
}

function normalizeGalleryImages(images: string[], coverImage: string) {
  // Galeri dizisi kaynak; vitrin her zaman 1. görseldir.
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

function isManagedGalleryUrl(url: string) {
  return url.startsWith("/uploads/villas/");
}

async function deleteGalleryFile(url: string) {
  if (!isManagedGalleryUrl(url)) return;
  const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    await unlink(filePath);
  } catch {
    // Dosya zaten silinmiş olabilir
  }
}

export async function uploadVillaGalleryImages(
  villaId: string,
  formData: FormData
): Promise<VillaGalleryActionState> {
  await requireAdmin();

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { error: "Yüklenecek dosya seçilmedi" };
  }

  try {
    const { villa, siteName } = await getVillaGalleryContext(villaId);
    const currentImages = normalizeGalleryImages(villa.images, villa.image);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "villas", villaId);
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];
    let sequence = getNextGallerySequence(currentImages);

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return {
          error: "Yalnızca JPG, PNG ve WEBP dosyaları yüklenebilir",
        };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { error: "Dosya boyutu 10 MB'dan küçük olmalıdır" };
      }

      const fileName = buildSeoGalleryFileName(siteName, villa.name, sequence);
      const outputPath = path.join(uploadDir, fileName);
      const sourceBuffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await processGalleryImageToWebp(sourceBuffer);
      await writeFile(outputPath, webpBuffer);

      uploadedUrls.push(`/uploads/villas/${villaId}/${fileName}`);
      sequence += 1;
    }

    const nextImages = [...currentImages, ...uploadedUrls];
    await persistGalleryOrder(villaId, nextImages);
    await revalidateVillaGallery(villaId, villa.slug);

    return { success: true, urls: uploadedUrls };
  } catch {
    return { error: "Görseller yüklenirken bir hata oluştu" };
  }
}

export async function updateVillaGalleryOrder(
  villaId: string,
  orderedUrls: string[]
): Promise<VillaGalleryActionState> {
  await requireAdmin();

  try {
    const { villa } = await getVillaGalleryContext(villaId);
    const current = new Set(normalizeGalleryImages(villa.images, villa.image));
    const sanitized = orderedUrls.filter((url) => current.has(url));

    if (sanitized.length !== current.size) {
      return { error: "Geçersiz galeri sıralaması" };
    }

    await persistGalleryOrder(villaId, sanitized);
    await revalidateVillaGallery(villaId, villa.slug);
    return { success: true };
  } catch {
    return { error: "Galeri sırası kaydedilemedi" };
  }
}

export async function setVillaGalleryVitrin(
  villaId: string,
  imageUrl: string
): Promise<VillaGalleryActionState> {
  await requireAdmin();

  try {
    const { villa } = await getVillaGalleryContext(villaId);
    const current = normalizeGalleryImages(villa.images, villa.image);
    const index = current.indexOf(imageUrl);

    if (index === -1) {
      return { error: "Görsel bulunamadı" };
    }

    const reordered = [
      imageUrl,
      ...current.filter((url) => url !== imageUrl),
    ];

    await persistGalleryOrder(villaId, reordered);
    await revalidateVillaGallery(villaId, villa.slug);
    return { success: true };
  } catch {
    return { error: "Vitrin görseli güncellenemedi" };
  }
}

export async function deleteVillaGalleryImages(
  villaId: string,
  imageUrls: string[]
): Promise<VillaGalleryActionState> {
  await requireAdmin();

  if (imageUrls.length === 0) {
    return { error: "Silinecek görsel seçilmedi" };
  }

  try {
    const { villa } = await getVillaGalleryContext(villaId);
    const current = normalizeGalleryImages(villa.images, villa.image);
    const toDelete = new Set(imageUrls);
    const remaining = current.filter((url) => !toDelete.has(url));

    await Promise.all(imageUrls.map((url) => deleteGalleryFile(url)));
    await persistGalleryOrder(villaId, remaining);
    await revalidateVillaGallery(villaId, villa.slug);
    return { success: true };
  } catch {
    return { error: "Görseller silinemedi" };
  }
}

export async function deleteAllVillaGalleryImages(
  villaId: string
): Promise<VillaGalleryActionState> {
  await requireAdmin();

  try {
    const { villa } = await getVillaGalleryContext(villaId);
    const current = normalizeGalleryImages(villa.images, villa.image);

    await Promise.all(current.map((url) => deleteGalleryFile(url)));
    await persistGalleryOrder(villaId, []);
    await revalidateVillaGallery(villaId, villa.slug);
    return { success: true };
  } catch {
    return { error: "Galeri temizlenemedi" };
  }
}

export type VillaGalleryImportActionState = VillaGalleryActionState & {
  message?: string;
  importedCount?: number;
};

export async function importVillaGalleryFromTatildeyizAction(
  villaId: string
): Promise<VillaGalleryImportActionState> {
  await requireAdmin();

  try {
    const { villa, siteName } = await getVillaGalleryContext(villaId);
    const result = await importVillaGalleryFromTatildeyiz(villa.id, {
      siteName,
      force: true,
    });

    await revalidateVillaGallery(villa.id, villa.slug);
    return {
      success: true,
      importedCount: result.importedCount,
      urls: result.localUrls,
      message: `${result.importedCount} görsel Tatildeyiz'den aktarıldı`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Galeri içe aktarılamadı";
    return { error: message };
  }
}
