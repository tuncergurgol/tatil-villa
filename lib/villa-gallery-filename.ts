export function sanitizeGalleryNamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSeoGalleryFileName(
  siteName: string,
  villaName: string,
  sequence: number
) {
  const site = sanitizeGalleryNamePart(siteName) || "Site";
  const villa = sanitizeGalleryNamePart(villaName) || "Villa";
  return `${site} - ${villa} - ${sequence}.webp`;
}

/** @deprecated Yeni yüklemeler için buildSeoGalleryFileName kullanın */
export function buildVillaGalleryFileName(
  siteName: string,
  villaName: string,
  sequence: number
) {
  return buildSeoGalleryFileName(siteName, villaName, sequence);
}

export function extractGallerySequence(url: string) {
  const fileName = url.split("/").pop() ?? "";
  const match = fileName.match(/ - (\d+)\.webp$/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getNextGallerySequence(existingUrls: string[], offset = 1) {
  const max = existingUrls.reduce(
    (highest, url) => Math.max(highest, extractGallerySequence(url)),
    0
  );
  return max + offset;
}
