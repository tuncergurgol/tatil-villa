/** /uploads/ yollarındaki boşluklu dosya adlarını tarayıcıda güvenli hale getirir. */
export function encodeGalleryImageUrl(url: string): string {
  if (!url.startsWith("/uploads/")) return url;

  const queryIndex = url.indexOf("?");
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : url.slice(queryIndex);
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return url;

  const directory = path.slice(0, lastSlash + 1);
  const fileName = path.slice(lastSlash + 1);
  if (!fileName.includes(" ")) return url;

  return `${directory}${encodeURIComponent(fileName)}${query}`;
}
