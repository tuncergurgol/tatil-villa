import type { Metadata } from "next";
import VillaSearchBar from "@/components/search/VillaSearchBar";
import VillaSearchSidebar from "@/components/search/VillaSearchSidebar";
import VillaSearchResults from "@/components/search/VillaSearchResults";
import {
  getHeroSearchRegions,
  getRegionBySlug,
  getRegionsWithCount,
} from "@/lib/queries/regions";
import {
  getVillas,
  getSearchCategoryOptions,
  getSearchFacilityCategoryOptions,
} from "@/lib/queries/villas";
import { prisma } from "@/lib/db";
import { countNightsBetween } from "@/lib/villa-period-selection";

export const metadata: Metadata = {
  title: "Villalar",
  description: "Kiralık villa ve bungalov listesi. Filtreleyin ve rezervasyon yapın.",
};

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
  }>;
}

export const dynamic = "force-dynamic";

const SEARCH_RESULT_LIMIT = 48;

async function getSearchAmenityOptions() {
  const [searchAmenities, villas] = await Promise.all([
    prisma.amenity.findMany({
      where: { active: true, showInSearch: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.villa.findMany({
      where: { active: true },
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
  const params = await searchParams;
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

  const [
    searchRegions,
    homeRegions,
    selectedRegion,
    categoryOptions,
    facilityOptions,
    amenityOptions,
    villas,
  ] = await Promise.all([
    getHeroSearchRegions(),
    getRegionsWithCount(),
    params.region ? getRegionBySlug(params.region) : null,
    getSearchCategoryOptions(),
    getSearchFacilityCategoryOptions(),
    getSearchAmenityOptions(),
    getVillas({
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
      limit: idList.length > 0 ? Math.max(idList.length, SEARCH_RESULT_LIMIT) : SEARCH_RESULT_LIMIT,
    }),
  ]);

  const nights =
    params.checkIn && params.checkOut
      ? countNightsBetween(params.checkIn, params.checkOut)
      : 0;

  const titleLabel = params.q?.trim()
    ? `"${params.q.trim()}" araması`
    : selectedRegion
      ? `${selectedRegion.name} Kiralık Villa`
      : params.filter === "deal"
        ? "Fırsat Villalar"
        : params.filter === "popular"
          ? "Popüler Villalar"
          : "Kiralık Villa";

  const initialRegion =
    selectedRegion
      ? {
          slug: selectedRegion.slug,
          name: selectedRegion.name,
          label: `${selectedRegion.name} Kiralık Villa`,
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
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
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
        <div className="flex flex-col gap-6 lg:flex-row">
          <VillaSearchSidebar
            regions={homeRegions}
            categories={categoryOptions}
            facilities={facilityOptions}
            amenities={amenityOptions}
            currentParams={currentParams}
          />
          <VillaSearchResults
            villas={villas}
            totalCount={villas.length}
            titleLabel={titleLabel}
            nights={nights}
            currentParams={currentParams}
            sort={sort}
          />
        </div>
      </div>
    </div>
  );
}
