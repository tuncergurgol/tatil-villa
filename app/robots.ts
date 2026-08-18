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
          "GoogleOther",
          "Google-InspectionTool",
          "Google-CloudVertexBot",
          "bingbot",
          "BingPreview",
          "Yandex",
          "YandexBot",
          "YandexImages",
          "DuckDuckBot",
          "DuckAssistBot",
          "Applebot",
          "Applebot-Extended",
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
          "MistralAI-User",
          "DeepSeekBot",
          "meta-externalfetcher",
          "TikTokSpider",
        ],
        allow: [
          "/",
          "/llms.txt",
          "/llms-full.txt",
          "/.well-known/llms.txt",
          "/.well-known/llms-full.txt",
          "/rss.xml",
          "/sitemap.xml",
          "/indexnow-key.txt",
        ],
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
