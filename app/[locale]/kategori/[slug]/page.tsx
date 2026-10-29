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
import { resolveSeoCategory } from "@/lib/queries/seo-category";
import { getVillaSearchResults } from "@/lib/queries/villas";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  isStockIndexable,
  buildCategoryPath,
  buildGuidePath,
  matrixFacilitiesForSite,
} from "@/lib/seo-matrix";
import {
  buildFacilityListingSeo,
} from "@/lib/seo-listing-content";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo-json-ld";
import { publicIndexingRobots } from "@/lib/public-indexing";
import { Link } from "@/lib/i18n/navigation";
import { villaPublicPath } from "@/lib/villa-public-path";
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
  const resolved = await resolveSeoCategory(slug, site.key);
  if (!resolved) return { title: "Kategori", robots: publicIndexingRobots(false) };

  const { region, facility } = resolved;
  const facilityLabel = localizeCatalogLabel(facility.name, locale);
  const title = region
    ? `${region.name} ${facilityLabel}`
    : facility.seoTitle?.trim() || facilityLabel;
  const description =
    facility.seoDescription?.trim() ||
    region?.seoDescription?.trim() ||
    maybeRewriteVillaWording(
      `${title} — güncel fiyat ve müsaitlik ile ${getPublicListingCopy(site.key, locale).plural}.`,
      site.key
    );

  const stock = await getVillaSearchResults({
    region: region?.slug,
    facilities: [facility.name],
    page: 1,
    pageSize: 1,
    siteKey: site.key,
  });

  return {
    title,
    description,
    alternates: buildPublicAlternates(locale, buildCategoryPath(slug)),
    robots: publicIndexingRobots(isStockIndexable(stock.totalCount)),
  };
}

export default async function KategoriPage({ params }: PageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const resolved = await resolveSeoCategory(slug, site.key);
  if (!resolved) notFound();

  const { region, facility } = resolved;
  const facilityLabel = localizeCatalogLabel(facility.name, locale);
  const copy = getPublicListingCopy(site.key, locale);

  const search = await getVillaSearchResults({
    region: region?.slug,
    facilities: [facility.name],
    sort: "recommended",
    page: 1,
    pageSize: 24,
    siteKey: site.key,
  });

  const indexable = isStockIndexable(search.totalCount);
  const titleLabel = region
    ? `${region.name} ${facilityLabel}`
    : facilityLabel;

  const relatedFacilities = await prisma.facilityCategory.findMany({
    where: { slug: { in: [...matrixFacilitiesForSite(site.key)] } },
    select: { slug: true, name: true },
    take: 6,
  });

  const seo = buildFacilityListingSeo({
    siteKey: site.key,
    facilityName: facilityLabel,
    facilitySlug: facility.slug,
    longDescription: facility.longDescription,
    villaCount: search.totalCount,
    regionName: region?.name,
    regionSlug: region?.slug,
  });

  if (region) {
    seo.relatedLinks = [
      {
        href: `/villalar?region=${encodeURIComponent(region.slug)}`,
        label: listingRegionRentalLabel(region.name, site.key, false, locale),
      },
      { href: buildGuidePath(region.slug), label: `${region.name} gezi rehberi` },
      ...relatedFacilities
        .filter((f) => f.slug !== facility.slug)
        .slice(0, 3)
        .map((f) => ({
          href: buildCategoryPath(`${region.slug}-${f.slug}`),
          label: `${region.name} ${localizeCatalogLabel(f.name, locale)}`,
        })),
      ...seo.relatedLinks.filter((l) => !l.href.startsWith("/villalar?region=")),
    ];
  }

  const origin = `https://${site.domain}`;
  const path = buildCategoryPath(slug);
  const crumbs = [
    { label: "Ana sayfa", href: "/" },
    { label: copy.plural, href: "/villalar" },
    ...(region
      ? [
          {
            label: region.name,
            href: `/villalar?region=${encodeURIComponent(region.slug)}`,
          },
        ]
      : []),
    { label: titleLabel },
  ];

  const breadcrumbLd = buildBreadcrumbListJsonLd(
    origin,
    crumbs.map((c) => ({ name: c.label, path: c.href || path }))
  );
  const faqLd = buildFaqPageJsonLd(seo.faqs);
  const collectionLd = buildCollectionPageJsonLd({
    name: titleLabel,
    description: seo.paragraphs[0] || titleLabel,
    path,
    origin,
    items: search.villas.slice(0, 20).map((villa) => ({
      name: villa.name,
      path: villaPublicPath(villa.slug),
    })),
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {indexable && faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      {indexable ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
        />
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ListingBreadcrumbs items={crumbs} />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {titleLabel}
          </h1>
          <p className="mt-1 text-sm text-sky-700">
            {search.totalCount} {copy.singular.toLocaleLowerCase("tr")} listeleniyor
            {!indexable
              ? " — bu kombinasyon henüz sınırlı stokta"
              : null}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Filtreli arama için{" "}
            <Link
              href={
                region
                  ? `/villalar?region=${encodeURIComponent(region.slug)}&facilities=${encodeURIComponent(facility.name)}`
                  : `/villalar?facilities=${encodeURIComponent(facility.name)}`
              }
              className="font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              gelişmiş listeye
            </Link>{" "}
            gidin.
          </p>
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
          {search.villas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-600">
              Bu kategoride şu an uygun ilan yok.{" "}
              <Link href="/villalar" className="text-sky-700 underline">
                Tüm {copy.plural.toLocaleLowerCase("tr")}
              </Link>
            </p>
          ) : null}
        </div>

        <ListingSeoSection content={seo} />
      </div>
    </div>
  );
}
