import { access, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { Attachment } from "nodemailer/lib/mailer";
import { resolveCompanyLogoUrl } from "@/lib/agency-message-render";

export const COMPANY_LOGO_CID = "company-logo";

const RASTER_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function toPublicFilePath(logoUrl: string): string | null {
  let pathname = logoUrl.trim();
  if (!pathname) return null;

  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  // Sadece public altındaki güvenli göreli yollar
  if (pathname.includes("..") || pathname.includes("\\")) {
    return null;
  }

  return path.join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

/**
 * E-posta istemcileri için logo kaynağı üretir.
 * Yerel /uploads dosyası varsa CID ek olarak gömer (canlıda 404 olan public URL’ye güvenmez).
 * SVG dosyaları Outlook uyumu için PNG’ye çevrilir.
 */
export async function prepareCompanyLogoForEmail(
  logoUrl: string | null | undefined,
  domain?: string | null
): Promise<{ src: string; attachments: Attachment[] }> {
  const trimmed = logoUrl?.trim() || "";
  if (!trimmed) {
    return { src: "", attachments: [] };
  }

  if (trimmed.startsWith("data:")) {
    return { src: trimmed, attachments: [] };
  }

  const filePath = toPublicFilePath(trimmed);
  if (filePath) {
    try {
      await access(filePath);
      const ext = path.extname(filePath).toLowerCase();

      if (ext === ".svg") {
        const content = await sharp(filePath).png().toBuffer();
        return {
          src: `cid:${COMPANY_LOGO_CID}`,
          attachments: [
            {
              filename: "logo.png",
              content,
              cid: COMPANY_LOGO_CID,
              contentType: "image/png",
              contentDisposition: "inline",
            },
          ],
        };
      }

      const contentType = RASTER_MIME[ext];
      if (contentType) {
        const content = await readFile(filePath);
        return {
          src: `cid:${COMPANY_LOGO_CID}`,
          attachments: [
            {
              filename: path.basename(filePath),
              content,
              cid: COMPANY_LOGO_CID,
              contentType,
              contentDisposition: "inline",
            },
          ],
        };
      }
    } catch {
      // Dosya yoksa veya okunamazsa mutlak URL’ye düş
    }
  }

  return {
    src: resolveCompanyLogoUrl(trimmed, domain),
    attachments: [],
  };
}
