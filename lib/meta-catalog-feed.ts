import { prisma } from "@/lib/db";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";
import type { PublicSiteProfile } from "@/lib/public-site-profile";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";
import { getVillaPeriodPriceRanges } from "@/lib/queries/villas";
import { getVillaGalleryImages } from "@/lib/villa-gallery";

const META_DESCRIPTION_MAX = 5000;
const META_TITLE_MAX = 150;

function resolveMetadataBase(domain: string): URL {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return new URL(`https://${cleaned || "www.tatildeyiz.com.tr"}`);
}

function absoluteAssetUrl(base: URL, assetPath: string): string {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return new URL(assetPath.startsWith("/") ? assetPath : `/${assetPath}`, base)
    .toString();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatMetaPrice(amount: number): string {
  const normalized = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return `${normalized.toFixed(2)} TRY`;
}

function resolveCatalogItemId(villa: {
  id: string;
  villaId: number | null;
}): string {
  if (villa.villaId != null) return String(villa.villaId);
  return villa.id;
}

function resolveCatalogTitle(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= META_TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, META_TITLE_MAX - 1).trim()}…`;
}

function resolveCatalogDescription(villa: {
  seoDescription: string | null;
  description: string;
  name: string;
}): string {
  const seo = villa.seoDescription?.trim();
  const body = stripHtml(villa.description ?? "");
  const text = seo || body || `${villa.name} kiralık villa.`;
  if (text.length <= META_DESCRIPTION_MAX) return text;
  return `${text.slice(0, META_DESCRIPTION_MAX - 1).trim()}…`;
}

export async function buildMetaCatalogFeedXml(
  site: PublicSiteProfile
): Promise<string> {
  const metadataBase = resolveMetadataBase(site.domain);
  const origin = metadataBase.origin;

  const villas = await prisma.villa.findMany({
    where: await resolvePublicSiteVillaFilter(
      { active: true, showInSearch: true },
      site.key
    ),
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      description: true,
      seoDescription: true,
      image: true,
      images: true,
      pricePerNight: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const priceRanges = await getVillaPeriodPriceRanges(villas.map((v) => v.id));

  const items = villas
    .map((villa) => {
      const gallery = getVillaGalleryImages(villa);
      const imagePath = gallery[0];
      if (!imagePath) return null;

      const range = priceRanges.get(villa.id);
      const nightlyPrice =
        range?.min ?? villa.pricePerNight ?? null;
      if (nightlyPrice == null || nightlyPrice <= 0) return null;

      const imageLink = absoluteAssetUrl(
        metadataBase,
        encodeGalleryImageUrl(imagePath)
      );
      const additionalImages = gallery
        .slice(1, 11)
        .map((path) =>
          absoluteAssetUrl(metadataBase, encodeGalleryImageUrl(path))
        )
        .filter(Boolean);

      return {
        id: resolveCatalogItemId(villa),
        title: resolveCatalogTitle(villa.name),
        description: resolveCatalogDescription(villa),
        link: new URL(`/${villa.slug}`, metadataBase).toString(),
        imageLink,
        additionalImages,
        price: formatMetaPrice(nightlyPrice),
        updatedAt: villa.updatedAt.toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const channelTitle = escapeXml(`${site.brandName} Villa Kataloğu`);
  const channelLink = escapeXml(origin);
  const channelDescription = escapeXml(
    `${site.brandName} aktif kiralık villa ilanları.`
  );

  const itemXml = items
    .map((item) => {
      const additionalImageTags = item.additionalImages
        .map(
          (url) =>
            `      <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`
        )
        .join("\n");

      return `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
${additionalImageTags ? `${additionalImageTags}\n` : ""}      <g:price>${escapeXml(item.price)}</g:price>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(site.brandName)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${channelTitle}</title>
    <link>${channelLink}</link>
    <description>${channelDescription}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemXml}
  </channel>
</rss>
`;
}

export function isMetaCatalogFeedAuthorized(_request: Request): boolean {
  // Meta Commerce Manager feed doğrulayıcısı token/query olmadan GET atar.
  // Katalog verisi public sitedeki ilanlarla aynıdır; feed herkese açıktır.
  return true;
}
