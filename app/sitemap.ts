import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";

function canonicalOrigin(domain: string): string {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return `https://${cleaned || "www.tatildeyiz.com.tr"}`;
}

function absoluteUrl(origin: string, path: string): string {
  if (!path || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOrigin(site.domain);
  const now = new Date();

  const staticPaths = [
    "/",
    "/villalar",
    "/blog",
    "/yorumlar",
    "/sik-sorulan-sorular",
    "/sizi-arayalim",
    "/tur",
    "/turlar",
    "/vip-transfer",
    "/arac-kiralama",
    "/bilet/ara",
    "/bilet/satinal",
    "/bilet/sonuc",
    "/otel",
    "/feribot",
  ];

  const villaWhere = await resolvePublicSiteVillaFilter(
    { active: true, showInSearch: true },
    site.key
  );
  const [villas, blogPosts, corporatePages, tours] = await Promise.all([
    prisma.villa.findMany({
      where: villaWhere,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
    prisma.cmsPage.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.tour.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...staticPaths.map((path) => ({
      url: absoluteUrl(origin, path),
      lastModified: now,
      changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
      priority: path === "/" ? 1 : path === "/villalar" ? 0.9 : 0.7,
    })),
    ...villas.map((villa) => ({
      url: absoluteUrl(origin, `/${villa.slug}`),
      lastModified: villa.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(origin, `/blog/${post.slug}`),
      lastModified: post.updatedAt ?? post.publishedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...corporatePages.map((page) => ({
      url: absoluteUrl(
        origin,
        page.slug === "sizi-arayalim"
          ? "/sizi-arayalim"
          : `/kurumsal/${page.slug}`
      ),
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...tours.map((tour) => ({
      url: absoluteUrl(origin, `/tur/${tour.slug}`),
      lastModified: tour.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return entries;
}
