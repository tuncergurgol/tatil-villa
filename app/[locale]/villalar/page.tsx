import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import VillaSearchBar from "@/components/search/VillaSearchBar";
import VillaSearchSidebar from "@/components/search/VillaSearchSidebar";
import VillaSearchResults from "@/components/search/VillaSearchResults";
import { localizeCatalogLabel } from "@/lib/i18n/localize-catalog-label";
import {
  getHeroSearchRegions,
  getRegionBySlug,
  getRegionsWithCount,
} from "@/lib/queries/regions";
import {
  getVillaSearchResults,
  getSearchCategoryOptions,
  getSearchFacilityCategoryOptions,
} from "@/lib/queries/villas";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";
import { countNightsBetween } from "@/lib/villa-period-selection";
import {
  parseVillaSearchPage,
  VILLA_SEARCH_PAGE_SIZE,
} from "@/lib/villa-search-params";
import {
  getPublicListingCopy,
  listingEarlyBookingTitle,
  listingRegionRentalLabel,
  maybeRewriteVillaWording,
} from "@/lib/public-listing-copy";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { villaListingDescription } from "@/lib/i18n/international-seo";
import {
  isIndexableVillaSearch,
  publicIndexingRobots,
  villaSearchCanonicalPath,
} from "@/lib/public-indexing";
import ListingBreadcrumbs from "@/components/seo/ListingBreadcrumbs";
import ListingSeoSection from "@/components/seo/ListingSeoSection";
import { buildRegionListingSeo } from "@/lib/seo-listing-content";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo-json-ld";
import { matrixFacilitiesForSite } from "@/lib/seo-matrix";
import { villaPublicPath } from "@/lib/villa-public-path";
import { getFacilityCategoryBySlug } from "@/lib/queries/seo-category";

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    region?: string;
    ids?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    babies?: string;
    pets?: string;
    minPrice?: string;
    maxPrice?: string;
    amenities?: string;
    facilities?: string;
    category?: string;
    q?: string;
    sort?: string;
    page?: string;
    year?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const [query, locale] = await Promise.all([searchParams, getLocale()]);
  const regionSlug = query.region?.trim() || "";
  const indexable = isIndexableVillaSearch(query);
  const canonical = villaSearchCanonicalPath(query);
  const region = regionSlug ? await getRegionBySlug(regionSlug) : null;
  const regionName = region?.name?.trim() || "";
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const copy = getPublicListingCopy(site.key, locale);

  return {
    title: regionName
      ? listingRegionRentalLabel(regionName, site.key, true, locale)
      : copy.rentalAndBungalows,
    description: maybeRewriteVillaWording(
      villaListingDescription(locale, regionName),
      site.key
    ),
    alternates: buildPublicAlternates(locale, canonical),
    robots: publicIndexingRobots(indexable),
  };
}

export const dynamic = "force-dynamic";

async function getSearchAmenityOptions(siteKey?: PublicSiteKey) {
  const villaWhere = await resolvePublicSiteVillaFilter({ active: true, showInSearch: true }, siteKey);
  const [searchAmenities, villas] = await Promise.all([
    prisma.amenity.findMany({
      where: { active: true, showInSearch: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.villa.findMany({
      where: villaWhere,
      select: { amenities: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const villa of villas) {
    for (const name of villa.amenities) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const uniqueByName = new Map<string, { name: string; count: number }>();
  for (const amenity of searchAmenities) {
    if (uniqueByName.has(amenity.name)) continue;
    uniqueByName.set(amenity.name, {
      name: amenity.name,
      count: counts.get(amenity.name) ?? 0,
    });
  }

  return Array.from(uniqueByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
  );
}

export default async function VillalarPage({ searchParams }: PageProps) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const amenityList = (params.amenities ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const facilityList = (params.facilities ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const idList = (params.ids ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const adults = params.adults ? parseInt(params.adults, 10) : undefined;
  const sort = params.sort || (params.region ? "random" : "recommended");
  const page = parseVillaSearchPage(params.page);
  const parsedYear = params.year ? parseInt(params.year, 10) : NaN;
  const priceYear =
    Number.isInteger(parsedYear) && parsedYear >= 2020 && parsedYear <= 2035
      ? parsedYear
      : undefined;

  const [
    searchRegions,
    homeRegions,
    selectedRegion,
    categoryOptions,
    facilityOptions,
    amenityOptions,
    villaSearch,
  ] = await Promise.all([
    getHeroSearchRegions(site.key),
    getRegionsWithCount(site.key, { mode: "search" }),
    params.region ? getRegionBySlug(params.region, site.key) : null,
    getSearchCategoryOptions(site.key),
    getSearchFacilityCategoryOptions(site.key),
    getSearchAmenityOptions(site.key),
    getVillaSearchResults({
      filter: params.filter,
      region: params.region,
      category: params.category,
      facilities: facilityList,
      ids: idList,
      q: params.q,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      amenities: amenityList,
      sort,
      page,
      pageSize: VILLA_SEARCH_PAGE_SIZE,
      siteKey: site.key,
      priceYear,
    }),
  ]);

  const { villas, totalCount, totalPages, pageSize } = villaSearch;

  const nights =
    params.checkIn && params.checkOut
      ? countNightsBetween(params.checkIn, params.checkOut)
      : 0;

  const copy = getPublicListingCopy(site.key, locale);
  const titleLabel = params.q?.trim()
    ? locale === "tr"
      ? `"${params.q.trim()}" araması`
      : `Search: "${params.q.trim()}"`
    : selectedRegion
      ? listingRegionRentalLabel(selectedRegion.name, site.key, false, locale)
      : params.filter === "deal"
        ? copy.deals
        : params.filter === "popular"
          ? copy.popular
          : priceYear
            ? listingEarlyBookingTitle(priceYear, site.key, locale)
            : copy.listingTitle;

  const initialRegion =
    selectedRegion
      ? {
          slug: selectedRegion.slug,
          name: selectedRegion.name,
          label: listingRegionRentalLabel(
            selectedRegion.name,
            site.key,
            false,
            locale
          ),
        }
      : searchRegions.find((r) => r.slug === params.region) ?? null;

  const currentParams = {
    filter: params.filter,
    region: params.region,
    category: params.category,
    facilities: params.facilities,
    q: params.q,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: params.adults,
    children: params.children,
    babies: params.babies,
    pets: params.pets,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    amenities: params.amenities,
    sort: params.sort,
    page: params.page,
    year: params.year,
  };

  const indexable = isIndexableVillaSearch(params);
  const showRegionSeo =
    indexable && Boolean(selectedRegion) && page === 1 && !params.q?.trim();

  const relatedFacilityRecords = showRegionSeo
    ? (
        await Promise.all(
          matrixFacilitiesForSite(site.key).map((facilitySlug) =>
            getFacilityCategoryBySlug(facilitySlug)
          )
        )
      ).filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  const regionSeo =
    showRegionSeo && selectedRegion
      ? buildRegionListingSeo({
          siteKey: site.key,
          regionName: selectedRegion.name,
          regionSlug: selectedRegion.slug,
          longDescription: selectedRegion.longDescription,
          seoDescription: selectedRegion.seoDescription,
          villaCount: totalCount,
          relatedFacilities: relatedFacilityRecords.map((f) => ({
            slug: f.slug,
            name: localizeCatalogLabel(f.name, locale),
          })),
        })
      : null;

  const origin = `https://${site.domain}`;
  const canonicalPath = villaSearchCanonicalPath(params);
  const crumbItems = [
    { label: "Ana sayfa", href: "/" },
    { label: copy.plural, href: "/villalar" },
    ...(selectedRegion
      ? [{ label: selectedRegion.name }]
      : []),
  ];

  const breadcrumbLd = buildBreadcrumbListJsonLd(
    origin,
    crumbItems.map((item) => ({
      name: item.label,
      path: item.href || canonicalPath,
    }))
  );
  const faqLd = regionSeo ? buildFaqPageJsonLd(regionSeo.faqs) : null;
  const collectionLd =
    showRegionSeo && selectedRegion
      ? buildCollectionPageJsonLd({
          name: titleLabel,
          description: regionSeo?.paragraphs[0] || titleLabel,
          path: canonicalPath,
          origin,
          items: villas.slice(0, 20).map((villa) => ({
            name: villa.name,
            path: villaPublicPath(villa.slug),
          })),
        })
      : null;

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
      {collectionLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
        />
      ) : null}

      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <VillaSearchBar
            regions={searchRegions}
            initialRegion={initialRegion}
            initialCheckIn={params.checkIn ?? ""}
            initialCheckOut={params.checkOut ?? ""}
            preserveParams={currentParams}
            initialGuests={{
              adults: adults && adults > 0 ? adults : 1,
              children: params.children ? parseInt(params.children, 10) || 0 : 0,
              babies: params.babies ? parseInt(params.babies, 10) || 0 : 0,
              pets: params.pets ? parseInt(params.pets, 10) || 0 : 0,
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ListingBreadcrumbs items={crumbItems} />
        <div className="flex flex-col gap-6 lg:flex-row">
          <VillaSearchSidebar
            regions={homeRegions}
            categories={categoryOptions.map((item) => ({
              ...item,
              label: localizeCatalogLabel(item.label, locale),
            }))}
            facilities={facilityOptions.map((item) => ({
              ...item,
              name: localizeCatalogLabel(item.name, locale),
            }))}
            amenities={amenityOptions.map((item) => ({
              ...item,
              name: localizeCatalogLabel(item.name, locale),
            }))}
            currentParams={currentParams}
          />
          <div className="min-w-0 flex-1">
            <VillaSearchResults
              villas={villas}
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              titleLabel={titleLabel}
              nights={nights}
              currentParams={currentParams}
              sort={sort}
            />
            {regionSeo ? <ListingSeoSection content={regionSeo} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
