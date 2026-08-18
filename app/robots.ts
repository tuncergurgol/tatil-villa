import type { MetadataRoute } from "next";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { canonicalOriginFromDomain } from "@/lib/search-discovery";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOriginFromDomain(site.domain);
  const publicDisallow = [
    "/admin",
    "/admin/",
    "/api/",
    "/giris-bilgilendirme/",
    "/rezervasyon-onay/",
    "/onay",
    "/villalar?",
  ];

  return {
    rules: [
      {
        userAgent: [
          "facebookexternalhit",
          "Facebot",
          "Meta-ExternalAgent",
          "facebookcatalog",
        ],
        allow: ["/", "/privacy.html", "/meta/"],
        disallow: [],
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Google-Extended",
          "bingbot",
          "BingPreview",
          "Yandex",
          "YandexBot",
          "YandexImages",
          "DuckDuckBot",
          "Applebot",
          "Slurp",
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
          "Amazonbot",
          "Bytespider",
          "CCBot",
          "cohere-ai",
          "YouBot",
        ],
        allow: ["/", "/llms.txt", "/llms-full.txt", "/rss.xml", "/sitemap.xml"],
        disallow: publicDisallow,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: publicDisallow,
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ""),
  };
}
