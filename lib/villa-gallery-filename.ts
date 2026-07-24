export const VILLA_GALLERY_SITE_NAME = "Tatildeyiz";

export function sanitizeGalleryNamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSeoGalleryFileName(villaName: string, sequence: number) {
  const villa = sanitizeGalleryNamePart(villaName) || "Villa";
  const parts = [VILLA_GALLERY_SITE_NAME, villa]
    .flatMap((part) => part.split(/\s+/))
    .filter(Boolean);
  return `${parts.join("-")}-${sequence}.webp`;
}

/** @deprecated buildSeoGalleryFileName(villaName, sequence) kullanın */
export function buildVillaGalleryFileName(
  _siteName: string,
  villaName: string,
  sequence: number
) {
  return buildSeoGalleryFileName(villaName, sequence);
}

export function extractGallerySequence(url: string) {
  const fileName = decodeURIComponent(url.split("/").pop() ?? "");
  const match = fileName.match(/(\d+)\.webp$/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getNextGallerySequence(existingUrls: string[], offset = 1) {
  const max = existingUrls.reduce(
    (highest, url) => Math.max(highest, extractGallerySequence(url)),
    0
  );
  return max + offset;
}
