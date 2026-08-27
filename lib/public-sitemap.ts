import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";

export function absolutePublicUrl(origin: string, path: string): string {
  if (!path || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

const STATIC_PATHS: Array<{
  path: string;
  title: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}> = [
  { path: "/", title: "Ana sayfa", changeFrequency: "daily", priority: 1 },
  { path: "/villalar", title: "Villalar", changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog", title: "Blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/yorumlar", title: "Yorumlar", changeFrequency: "weekly", priority: 0.7 },
  {
    path: "/sik-sorulan-sorular",
    title: "Sık sorulan sorular",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/sizi-arayalim",
    title: "Sizi arayalım",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/sadakat",
    title: "Sadakat Programı",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/kampanyalar/12-taksit",
    title: "12 Taksit İmkanı",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/kampanyalar/tatil-danismani",
    title: "Tatil Danışmanı",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/kampanyalar/2027-erken-rezervasyon",
    title: "2027 Erken Rezervasyon",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  { path: "/tur", title: "Tur rezervasyonu", changeFrequency: "weekly", priority: 0.7 },
  { path: "/turlar", title: "Turlar", changeFrequency: "weekly", priority: 0.7 },
  { path: "/vip-transfer", title: "VIP transfer", changeFrequency: "weekly", priority: 0.7 },
  {
    path: "/arac-kiralama",
    title: "Araç kiralama",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  { path: "/bilet/ara", title: "Uçak ve otobüs bileti", changeFrequency: "weekly", priority: 0.7 },
  { path: "/bilet/satinal", title: "Bilet satın al", changeFrequency: "weekly", priority: 0.5 },
  { path: "/bilet/sonuc", title: "Bilet sonuç", changeFrequency: "weekly", priority: 0.5 },
  { path: "/otel", title: "Otel", changeFrequency: "weekly", priority: 0.7 },
  { path: "/feribot", title: "Feribot", changeFrequency: "weekly", priority: 0.7 },
];

export type PublicIndexablePage = {
  url: string;
  title: string;
  lastModified: Date;
};

export async function getPublicIndexablePages(
  siteKey: PublicSiteKey,
  origin: string
): Promise<PublicIndexablePage[]> {
  const now = new Date();
  const villaWhere = await resolvePublicSiteVillaFilter(
    { active: true, showInSearch: true },
    siteKey
  );
  const [villas, blogPosts, corporatePages, tours, regions] = await Promise.all([
    prisma.villa.findMany({
      where: villaWhere,
      select: { slug: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, title: true, updatedAt: true, publishedAt: true },
    }),
    prisma.cmsPage.findMany({
      where: { published: true },
      select: { slug: true, title: true, updatedAt: true },
    }),
    prisma.tour.findMany({
      where: { isActive: true },
      select: { slug: true, title: true, updatedAt: true },
    }),
    prisma.region.findMany({
      where: { active: true, published: true },
      select: { slug: true, name: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return [
    ...STATIC_PATHS.map((item) => ({
      url: absolutePublicUrl(origin, item.path),
      title: item.title,
      lastModified: now,
    })),
    ...villas.map((villa) => ({
      url: absolutePublicUrl(origin, `/${villa.slug}`),
      title: villa.name,
      lastModified: villa.updatedAt,
    })),
    ...blogPosts.map((post) => ({
      url: absolutePublicUrl(origin, `/blog/${post.slug}`),
      title: post.title,
      lastModified: post.updatedAt ?? post.publishedAt ?? now,
    })),
    ...corporatePages.map((page) => ({
      url: absolutePublicUrl(
        origin,
        page.slug === "sizi-arayalim" ? "/sizi-arayalim" : `/kurumsal/${page.slug}`
      ),
      title: page.title,
      lastModified: page.updatedAt,
    })),
    ...tours.map((tour) => ({
      url: absolutePublicUrl(origin, `/tur/${tour.slug}`),
      title: tour.title,
      lastModified: tour.updatedAt,
    })),
    ...regions.map((region) => ({
      url: absolutePublicUrl(
        origin,
        `/villalar?region=${encodeURIComponent(region.slug)}`
      ),
      title: `${region.name} Kiralık Villalar`,
      lastModified: region.updatedAt,
    })),
  ];
}

export async function buildPublicSitemap(
  siteKey: PublicSiteKey,
  origin: string
): Promise<MetadataRoute.Sitemap> {
  const pages = await getPublicIndexablePages(siteKey, origin);
  const staticByUrl = new Map(
    STATIC_PATHS.map((item) => [absolutePublicUrl(origin, item.path), item])
  );

  return pages.map((page) => {
    const staticItem = staticByUrl.get(page.url);
    if (staticItem) {
      return {
        url: page.url,
        lastModified: page.lastModified,
        changeFrequency: staticItem.changeFrequency,
        priority: staticItem.priority,
      };
    }
    if (page.url.includes("/blog/")) {
      return {
        url: page.url,
        lastModified: page.lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    }
    if (page.url.includes("/tur/")) {
      return {
        url: page.url,
        lastModified: page.lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    }
    if (page.url.includes("/villalar?region=")) {
      return {
        url: page.url,
        lastModified: page.lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    }
    if (page.url.includes("/kurumsal/")) {
      return {
        url: page.url,
        lastModified: page.lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      };
    }
    return {
      url: page.url,
      lastModified: page.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    };
  });
}
