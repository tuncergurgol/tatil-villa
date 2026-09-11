import { uploadBufferToR2, getR2ConfigFromEnv } from "@/lib/r2-storage";
import type { PublicSiteKey } from "@/lib/public-site-keys";

export function buildMetaCatalogFeedR2ObjectKey(siteKey: PublicSiteKey): string {
  return `feeds/meta-catalog/${siteKey}.xml`;
}

export function buildMetaCatalogFeedR2Url(siteKey: PublicSiteKey): string | null {
  const config = getR2ConfigFromEnv();
  if (!config) return null;
  return `${config.publicBaseUrl}/${buildMetaCatalogFeedR2ObjectKey(siteKey)}`;
}

export async function publishMetaCatalogFeedToR2(
  siteKey: PublicSiteKey,
  xml: string
): Promise<string | null> {
  const config = getR2ConfigFromEnv();
  if (!config) return null;

  const url = await uploadBufferToR2({
    config,
    objectKey: buildMetaCatalogFeedR2ObjectKey(siteKey),
    body: Buffer.from(xml, "utf8"),
    contentType: "text/xml; charset=utf-8",
    cacheControl: "public, max-age=3600",
  });

  return url;
}
