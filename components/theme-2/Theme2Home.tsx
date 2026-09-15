import Image from "next/image";
import Link from "next/link";
import Theme2SearchBar from "@/components/theme-2/Theme2SearchBar";
import Theme2VillaCard from "@/components/theme-2/Theme2VillaCard";
import { getTheme2FacilityChips } from "@/lib/queries/facility-categories";
import { getHeroSearchRegions, getRegionsWithCount } from "@/lib/queries/regions";
import { getVillas } from "@/lib/queries/villas";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import type { Villa } from "@/lib/types";

function uniqueVillas(primary: Villa[], fallback: Villa[], limit: number) {
  const seen = new Set<string>();
  const merged: Villa[] = [];
  for (const villa of [...primary, ...fallback]) {
    if (seen.has(villa.id)) continue;
    seen.add(villa.id);
    merged.push(villa);
    if (merged.length >= limit) break;
  }
  return merged;
}

export default async function Theme2Home({
  brandName,
  siteKey,
}: {
  brandName: string;
  siteKey: PublicSiteKey;
}) {
  const [searchRegions, regions, popular, listed, typeChips] = await Promise.all([
    getHeroSearchRegions(siteKey),
    getRegionsWithCount(siteKey, { mode: "home" }),
    getVillas({ siteKey, filter: "popular", limit: 16 }),
    getVillas({ siteKey, limit: 16 }),
    getTheme2FacilityChips(siteKey),
  ]);

  const villas = uniqueVillas(popular, listed, 16);
  const destinations = regions.filter((region) => region.villaCount > 0).slice(0, 8);

  return (
    <div className="bg-[#F7F6F3] text-slate-900">
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Glamping, bungalov ve kubbe evleri keşfet
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
            {brandName} ile Türkiye&apos;nin en güzel doğasında bungalov ve
            kubbe konaklamalarını bulun.
          </p>
          <div className="relative z-20 mt-8">
            <Theme2SearchBar regions={searchRegions} />
          </div>
        </div>
      </section>

      {typeChips.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {typeChips.map((chip) => (
              <Link
                key={chip.name}
                href={chip.href}
                className="group relative h-28 w-44 shrink-0 overflow-hidden rounded-2xl sm:h-36 sm:w-56"
              >
                <Image
                  src={chip.image}
                  alt={chip.name}
                  width={448}
                  height={288}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  sizes="224px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/10" />
                <span className="absolute bottom-3 left-3 text-sm font-semibold text-white">
                  {chip.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Öne çıkan konaklamalar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Doğa içinde bungalov ve kubbe evleri
            </p>
          </div>
          <Link
            href="/villalar"
            className="hidden text-sm font-semibold text-[#0E4F46] hover:underline sm:inline"
          >
            Tümünü gör
          </Link>
        </div>

        {villas.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {villas.map((villa) => (
              <Theme2VillaCard key={villa.id} villa={villa} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500">
            Şu anda listelenecek konaklama bulunamadı.
          </p>
        )}

        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/villalar"
            className="rounded-full bg-[#0E4F46] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tümünü gör
          </Link>
        </div>
      </section>

      <Theme2Destinations regions={destinations} />
    </div>
  );
}

function Theme2Destinations({
  regions,
}: {
  regions: Array<{
    id: string;
    slug: string;
    name: string;
    image: string;
    villaCount: number;
  }>;
}) {
  if (regions.length === 0) return null;

  return (
    <section id="bolgeler" className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Popüler bölgeler
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Glamping için en çok tercih edilen destinasyonlar
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {regions.map((region) => (
            <Link
              key={region.id}
              href={`/villalar?region=${encodeURIComponent(region.slug)}`}
              className="group overflow-hidden rounded-[1.35rem]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={region.image}
                  alt={region.name}
                  width={640}
                  height={480}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-sm font-semibold text-white">{region.name}</p>
                  <p className="text-xs text-white/80">
                    {region.villaCount} konaklama
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
