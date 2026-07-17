import type { Metadata } from "next";
import { siteConfig } from "@/lib/data";
import { getCompanySettings } from "@/lib/queries/company-settings";

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

export async function buildRootMetadata(): Promise<Metadata> {
  const settings = await getCompanySettings();
  const metadataBase = resolveMetadataBase(settings.domain || siteConfig.name);
  const title =
    settings.seoTitle?.trim() ||
    `${siteConfig.name} - ${siteConfig.tagline}`;
  const description =
    settings.seoDescription?.trim() ||
    "Türkiye'nin en güzel bölgelerinde villa ve bungalov kiralama.";
  const faviconUrl = settings.faviconUrl?.trim() || "";
  const ogImageUrl =
    settings.ogImageUrl?.trim() ||
    settings.logoUrl?.trim() ||
    "";
  const ogImages = ogImageUrl
    ? [{ url: absoluteAssetUrl(metadataBase, ogImageUrl) }]
    : undefined;

  return {
    metadataBase,
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    applicationName: siteConfig.name,
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
      siteName: siteConfig.name,
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
    verification: settings.googleSearchConsoleCode?.trim()
      ? { google: settings.googleSearchConsoleCode.trim() }
      : undefined,
    robots: {
      index: true,
      follow: true,
    },
  };
}
