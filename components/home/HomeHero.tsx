import Image from "next/image";
import { Suspense } from "react";
import HeroSearch from "@/components/HeroSearch";
import { getHeroSearchRegions } from "@/lib/queries/regions";
import {
  HERO_LCP_QUALITY,
  HERO_LCP_SIZES,
} from "@/lib/preload-lcp-image";

export default function HomeHero({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string;
}) {
  return (
    <section className="relative flex min-h-[520px] items-center justify-center overflow-visible pb-24 sm:min-h-[580px] sm:pb-28">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={imageUrl}
          alt="Tatil manzarası"
          fill
          className="object-cover"
          sizes={HERO_LCP_SIZES}
          quality={HERO_LCP_QUALITY}
          priority
          fetchPriority="high"
        />
      </div>

      <div className="relative z-10 w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </div>

        <div className="relative z-20 mt-8">
          <Suspense fallback={<HeroSearchFallback />}>
            <HomeHeroSearch />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function HeroSearchFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="h-12 rounded-2xl bg-white/90 shadow-lg sm:h-14" />
    </div>
  );
}

async function HomeHeroSearch() {
  const regions = await getHeroSearchRegions();
  return <HeroSearch regions={regions} />;
}
