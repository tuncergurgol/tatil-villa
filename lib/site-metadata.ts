import type { Metadata } from "next";
import { siteConfig } from "@/lib/data";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteTracking } from "@/lib/queries/public-site-tracking";

export function resolveMetadataBase(domain: string): URL {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return new URL(`https://${cleaned || "www.tatildeyiz.com.tr"}`);
}

export function absoluteAssetUrl(base: URL, assetPath: string): string {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return new URL(assetPath.startsWith("/") ? assetPath : `/${assetPath}`, base)
    .toString();
}

export async function buildRootMetadata(): Promise<Metadata> {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const tracking = await getPublicSiteTracking(site.key);
  const metadataBase = resolveMetadataBase(site.domain || siteConfig.name);
  const title =
    site.seoTitle?.trim() ||
    `${siteConfig.name} - ${siteConfig.tagline}`;
  const description =
    site.seoDescription?.trim() ||
    "Türkiye'nin en güzel bölgelerinde villa ve bungalov kiralama.";
  const faviconUrl = site.faviconUrl?.trim() || "";
  const ogImageUrl =
    site.ogImageUrl?.trim() ||
    site.logoUrl?.trim() ||
    "";
  const ogImages = ogImageUrl
    ? [{ url: absoluteAssetUrl(metadataBase, ogImageUrl) }]
    : undefined;
  const gscCode = tracking.googleSearchConsoleCode?.trim();

  return {
    metadataBase,
    title: {
      default: title,
      template: `%s | ${site.brandName || siteConfig.name}`,
    },
    description,
    applicationName: site.brandName || siteConfig.name,
    referrer: "origin",
    icons: faviconUrl
      ? {
          icon: [{ url: faviconUrl }],
          shortcut: faviconUrl,
          apple: faviconUrl,
        }
      : undefined,
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: site.brandName || siteConfig.name,
      title,
      description,
      images: ogImages,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages?.map((image) => image.url),
    },
    verification: gscCode ? { google: gscCode } : undefined,
    robots: {
      index: true,
      follow: true,
    },
  };
}
