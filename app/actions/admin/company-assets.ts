"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth-helpers";

const ASSET_TYPES = [
  "logo",
  "favicon",
  "ogImage",
  "whiteLogo",
  "tursabLogo",
  "region",
  "facilityCategory",
  "villaDocument",
] as const;
type AssetType = (typeof ASSET_TYPES)[number];

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/webp": ".webp",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export type UploadAssetResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function uploadCompanyAsset(
  formData: FormData
): Promise<UploadAssetResult> {
  await requireAdmin();

  const file = formData.get("file");
  const assetType = formData.get("assetType");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Dosya seçilmedi" };
  }

  if (!ASSET_TYPES.includes(assetType as AssetType)) {
    return { success: false, error: "Geçersiz dosya türü" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "Dosya boyutu 5 MB'dan küçük olmalıdır" };
  }

  const extension =
    path.extname(file.name).toLowerCase() ||
    MIME_EXTENSIONS[file.type] ||
    "";

  const allowedExtensions =
    assetType === "favicon"
      ? [".ico", ".png", ".svg"]
      : assetType === "villaDocument"
        ? [".png", ".jpg", ".jpeg", ".webp", ".pdf"]
        : [".png", ".svg", ".jpg", ".jpeg", ".webp"];

  if (!allowedExtensions.includes(extension)) {
    return {
      success: false,
      error: `Desteklenmeyen dosya formatı: ${extension || file.type}`,
    };
  }

  try {
    const subDir =
      assetType === "facilityCategory"
        ? "facility-categories"
        : assetType === "villaDocument"
          ? "villa-documents"
          : "company";
    const uploadDir = path.join(process.cwd(), "public", "uploads", subDir);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${assetType}-${Date.now()}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), buffer);

    return { success: true, url: `/uploads/${subDir}/${fileName}` };
  } catch {
    return { success: false, error: "Dosya yüklenirken bir hata oluştu" };
  }
}
