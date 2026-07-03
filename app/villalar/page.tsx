import type { Metadata } from "next";
import VillaGrid from "@/components/VillaGrid";
import { getRegionBySlug, getRegionFilterOptions } from "@/lib/queries/regions";
import { getVillas } from "@/lib/queries/villas";

export const metadata: Metadata = {
  title: "Villalar",
  description: "Kiralık villa ve bungalov listesi. Filtreleyin ve rezervasyon yapın.",
};

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    region?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function VillalarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [filterOptions, selectedRegion] = await Promise.all([
    getRegionFilterOptions(),
    params.region ? getRegionBySlug(params.region) : null,
  ]);

  const filtered = await getVillas({
    filter: params.filter,
    region: params.region,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: params.adults ? parseInt(params.adults, 10) : undefined,
  });

  const title = selectedRegion
    ? `${selectedRegion.displayName} Villaları`
    : params.filter === "deal"
      ? "Fırsat Villalar"
      : params.filter === "popular"
        ? "Popüler Villalar"
        : params.filter === "recommended"
          ? "Önerilen Villalar"
          : "Tüm Villalar";

  return (
    <div className="bg-gray-50">
      <div className="bg-teal-950 py-10 text-white sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-teal-200">
            {filtered.length} villa bulundu
            {params.checkIn && params.checkOut && (
              <> · {params.checkIn} — {params.checkOut}</>
            )}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip href="/villalar" active={!params.filter && !params.region}>
            Tümü
          </FilterChip>
          <FilterChip
            href="/villalar?filter=popular"
            active={params.filter === "popular"}
          >
            Popüler
          </FilterChip>
          <FilterChip href="/villalar?filter=deal" active={params.filter === "deal"}>
            Fırsat
          </FilterChip>
          <FilterChip
            href="/villalar?filter=recommended"
            active={params.filter === "recommended"}
          >
            Önerilen
          </FilterChip>
          {filterOptions.map((region) => (
            <FilterChip
              key={region.slug}
              href={`/villalar?region=${region.slug}`}
              active={params.region === region.slug}
            >
              {region.name}
            </FilterChip>
          ))}
        </div>

        <VillaGrid villas={filtered} />
      </div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-teal-600 text-white"
          : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-teal-300"
      }`}
    >
      {children}
    </a>
  );
}
