import type { Metadata } from "next";
import type { PublicSiteProfile } from "@/lib/public-site-profile";
import {
  absoluteAssetUrl,
  resolveMetadataBase,
} from "@/lib/site-metadata";
import {
  isIndexableLocale,
  publicIndexingRobots,
} from "@/lib/public-indexing";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";

export type VillaMetadataSource = {
  slug: string;
  name: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string[];
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

function resolveVillaPageTitle(villa: VillaMetadataSource, domain: string): string {
  const cleanDomain = normalizeDomain(domain);
  const seoTitle = villa.seoTitle?.trim();
  if (seoTitle) {
    if (seoTitle.toLowerCase().includes(cleanDomain.toLowerCase())) {
      return seoTitle;
    }
    return `${seoTitle} | ${cleanDomain}`;
  }
  return `${villa.name} | ${cleanDomain}`;
}

function resolveVillaPageDescription(villa: VillaMetadataSource): string {
  const seo = villa.seoDescription?.trim();
  if (seo) return seo;
  const fromBody = stripHtml(villa.description ?? "");
  if (fromBody) return fromBody.slice(0, 320);
  return `${villa.name} kiralık villa ve tatil seçenekleri.`;
}

export function buildVillaDetailMetadata(
  villa: VillaMetadataSource,
  site: PublicSiteProfile,
  options?: { locale?: string }
): Metadata {
  const metadataBase = resolveMetadataBase(site.domain);
  const domain = metadataBase.host;
  const title = resolveVillaPageTitle(villa, domain);
  const description = resolveVillaPageDescription(villa);
  const showcase = getVillaShowcaseImage({
    image: villa.image ?? "",
    images: villa.images ?? [],
  });
  const imageUrl = showcase ? absoluteAssetUrl(metadataBase, showcase) : "";
  const pageUrl = new URL(`/${villa.slug}`, metadataBase).toString();
  const ogImages = imageUrl ? [{ url: imageUrl, alt: villa.name }] : undefined;

  return {
    title: { absolute: title },
    description,
    robots: publicIndexingRobots(isIndexableLocale(options?.locale)),
    alternates: {
      canonical: `/${villa.slug}`,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: site.brandName || domain,
      title,
      description,
      url: pageUrl,
      images: ogImages,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
