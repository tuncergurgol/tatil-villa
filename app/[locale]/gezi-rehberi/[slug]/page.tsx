import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import ListingBreadcrumbs from "@/components/seo/ListingBreadcrumbs";
import ListingSeoSection from "@/components/seo/ListingSeoSection";
import VillaResultCard from "@/components/search/VillaResultCard";
import { localizeCatalogLabel } from "@/lib/i18n/localize-catalog-label";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import {
  getPublicListingCopy,
  listingRegionRentalLabel,
  maybeRewriteVillaWording,
} from "@/lib/public-listing-copy";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getRegionBySlug } from "@/lib/queries/regions";
import { getVillaSearchResults } from "@/lib/queries/villas";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  buildCategoryPath,
  buildGuidePath,
  matrixFacilitiesForSite,
} from "@/lib/seo-matrix";
import { buildGuideHubSeo } from "@/lib/seo-listing-content";
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo-json-ld";
import { publicIndexingRobots } from "@/lib/public-indexing";
import { getCuratedRegionSeoGuide } from "@/lib/seo-region-guides";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/db";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const region = await getRegionBySlug(slug, site.key);
  if (!region) return { title: "Rehber", robots: publicIndexingRobots(false) };

  const curated =
    locale === "tr"
      ? getCuratedRegionSeoGuide(slug, site.key, site.brandName)
      : null;
  const title =
    curated?.title ||
    region.seoTitle?.trim() ||
    `${region.name} Gezi ve Villa Rehberi`;
  const description =
    curated?.description ||
    region.seoDescription?.trim() ||
    maybeRewriteVillaWording(
      `${region.name} tatil rehberi: gezilecek yerler, konaklama ipuçları ve ${getPublicListingCopy(site.key, locale).plural}.`,
      site.key
    );

  return {
    title,
    description,
    alternates: buildPublicAlternates(locale, buildGuidePath(slug)),
    robots: publicIndexingRobots(true),
  };
}

export default async function RehberPage({ params }: PageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const region = await getRegionBySlug(slug, site.key);
  if (!region) notFound();

  const copy = getPublicListingCopy(site.key, locale);
  const curatedGuide = getCuratedRegionSeoGuide(
    slug,
    site.key,
    site.brandName
  );
  const search = await getVillaSearchResults({
    region: region.slug,
    sort: "recommended",
    page: 1,
    pageSize: 8,
    siteKey: site.key,
  });

  const facilities = await prisma.facilityCategory.findMany({
    where: { slug: { in: [...matrixFacilitiesForSite(site.key)] } },
    select: { slug: true, name: true },
  });

  const seo = buildGuideHubSeo({
    siteKey: site.key,
    regionName: region.name,
    regionSlug: region.slug,
    brandName: site.brandName,
    longDescription: region.longDescription || region.description,
    villaCount: search.totalCount,
  });

  seo.relatedLinks = [
    {
      href: `/villalar?region=${encodeURIComponent(region.slug)}`,
      label: listingRegionRentalLabel(region.name, site.key, false, locale),
    },
    ...facilities.slice(0, 6).map((f) => ({
      href: buildCategoryPath(`${region.slug}-${f.slug}`),
      label: `${region.name} ${localizeCatalogLabel(f.name, locale)}`,
    })),
    ...(region.slug === "kalkan"
      ? [
          {
            href: "/blog/kalkan-gezilecek-yerler-ve-plajlar",
            label: "Kalkan gezilecek yerler ve plajlar",
          },
        ]
      : []),
    { href: "/blog", label: "Blog yazıları" },
    { href: "/sizi-arayalim", label: "Sizi arayalım" },
  ];

  const origin = `https://${site.domain}`;
  const path = buildGuidePath(slug);
  const crumbs = [
    { label: "Ana sayfa", href: "/" },
    { label: "Rehberler", href: "/blog" },
    { label: `${region.name} rehberi` },
  ];

  const breadcrumbLd = buildBreadcrumbListJsonLd(
    origin,
    crumbs.map((c) => ({ name: c.label, path: c.href || path }))
  );
  const faqLd = buildFaqPageJsonLd(seo.faqs);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ListingBreadcrumbs items={crumbs} />
        <header className="mb-8 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Bölge rehberi
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
            {curatedGuide?.h1 ||
              `${region.name} gezi ve ${copy.singular.toLocaleLowerCase("tr")} rehberi`}
          </h1>
        </header>

        <ListingSeoSection content={seo} className="mt-0" />

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {region.name} {copy.plural.toLocaleLowerCase("tr")}
            </h2>
            <Link
              href={`/villalar?region=${encodeURIComponent(region.slug)}`}
              className="text-sm font-medium text-sky-700 hover:underline"
            >
              Tümünü gör
            </Link>
          </div>
          <div className="space-y-4">
            {search.villas.map((villa, index) => (
              <VillaResultCard
                key={villa.id}
                villa={villa}
                nights={0}
                priority={index === 0}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
