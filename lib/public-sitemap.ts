import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { localeToBcp47 } from "@/lib/i18n/locale-display";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { prisma } from "@/lib/db";
import { looksLikeMissingPageText } from "@/lib/public-seo";
import {
  getPublicListingCopy,
  listingRegionRentalLabel,
} from "@/lib/public-listing-copy";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";
import { listIndexableSeoCategorySlugs } from "@/lib/queries/seo-category";
import {
  SEO_GUIDE_REGION_SLUGS,
  buildCategoryPath,
  buildGuidePath,
} from "@/lib/seo-matrix";
import { SEO_TEMA_SLUGS } from "@/lib/seo-topic-guides";

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
  { path: "/tur/liste", title: "Turlar", changeFrequency: "weekly", priority: 0.7 },
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
  const [villas, blogPosts, corporatePages, tours, regions, matrixPages] =
    await Promise.all([
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
      select: {
        slug: true,
        title: true,
        updatedAt: true,
        seoTitle: true,
        excerpt: true,
        content: true,
      },
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
    listIndexableSeoCategorySlugs(siteKey),
  ]);

  const guideRegions = regions.filter((region) =>
    (SEO_GUIDE_REGION_SLUGS as readonly string[]).includes(region.slug)
  );

  const copy = getPublicListingCopy(siteKey);
  const sitePaths =
    siteKey === "tatildeyiz"
      ? [
          {
            path: "/yeni-otel",
            title: "Yeni Otel",
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : [];
  return [
    ...[...STATIC_PATHS, ...sitePaths].map((item) => ({
      url: absolutePublicUrl(origin, item.path),
      title:
        item.path === "/villalar" ? copy.plural : item.title,
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
    ...corporatePages
      .filter(
        (page) =>
          !looksLikeMissingPageText(page.seoTitle) &&
          !looksLikeMissingPageText(page.excerpt) &&
          !looksLikeMissingPageText(page.content) &&
          page.slug !== "elektronik-ilet-ve-acik-riza-metni"
      )
      .map((page) => ({
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
      title: listingRegionRentalLabel(region.name, siteKey, true),
      lastModified: region.updatedAt,
    })),
    ...matrixPages.map((page) => ({
      url: absolutePublicUrl(origin, buildCategoryPath(page.slug)),
      title: page.title,
      lastModified: now,
    })),
    ...guideRegions.map((region) => ({
      url: absolutePublicUrl(origin, buildGuidePath(region.slug)),
      title: `${region.name} rehberi`,
      lastModified: region.updatedAt,
    })),
    ...SEO_TEMA_SLUGS.map((slug) => ({
      url: absolutePublicUrl(origin, `/tema/${slug}`),
      title: slug,
      lastModified: now,
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

  return pages.flatMap((page) => {
    const relative = page.url.startsWith(origin)
      ? page.url.slice(origin.length) || "/"
      : page.url;
    const alternates = buildPublicAlternates("tr", relative);
    const languages = Object.fromEntries(
      Object.entries(alternates.languages).map(([code, path]) => [
        code,
        absolutePublicUrl(origin, path),
      ])
    );
    const staticItem = staticByUrl.get(page.url);
    const shared = {
      lastModified: page.lastModified,
      changeFrequency: staticItem
        ? staticItem.changeFrequency
        : page.url.includes("/blog/")
          ? ("weekly" as const)
          : page.url.includes("/tur/")
            ? ("weekly" as const)
            : page.url.includes("/villalar?region=")
              ? ("weekly" as const)
              : page.url.includes("/kategori/")
                ? ("weekly" as const)
                : page.url.includes("/gezi-rehberi/")
                  ? ("weekly" as const)
                  : page.url.includes("/tema/")
                    ? ("weekly" as const)
                    : page.url.endsWith("/yeni-otel")
                      ? ("weekly" as const)
                      : page.url.includes("/kurumsal/")
                        ? ("monthly" as const)
                        : ("daily" as const),
      priority: staticItem
        ? staticItem.priority
        : page.url.includes("/blog/")
          ? 0.6
          : page.url.includes("/tur/")
            ? 0.6
            : page.url.includes("/villalar?region=")
              ? 0.6
              : page.url.includes("/kategori/")
                ? 0.65
                : page.url.includes("/gezi-rehberi/")
                  ? 0.7
                  : page.url.includes("/tema/")
                    ? 0.7
                    : page.url.endsWith("/yeni-otel")
                      ? 0.7
                      : page.url.includes("/kurumsal/")
                        ? 0.5
                        : 0.8,
      alternates: { languages },
    };

    return locales.flatMap((locale) => {
      const href = languages[localeToBcp47(locale)];
      if (!href) return [];
      return [{ url: href, ...shared }];
    });
  });
}
