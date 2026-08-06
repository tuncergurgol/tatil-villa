import type { MetadataRoute } from "next";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

function canonicalOrigin(domain: string): string {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return `https://${cleaned || "www.tatildeyiz.com.tr"}`;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOrigin(site.domain);

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
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/giris-bilgilendirme/",
          "/rezervasyon-onay/",
          "/onay",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ""),
  };
}
