import { getImageProps } from "next/image";
import { Suspense } from "react";
import HeroSearch from "@/components/HeroSearch";
import { getHeroSearchRegions } from "@/lib/queries/regions";
import {
  HERO_LCP_QUALITY,
  HERO_LCP_SIZES,
  pickSrcSetCandidate,
} from "@/lib/preload-lcp-image";

export default function HomeHero({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string;
}) {
  const { props } = getImageProps({
    src: imageUrl,
    alt: "Tatil manzarası",
    width: 1400,
    height: 900,
    sizes: HERO_LCP_SIZES,
    quality: HERO_LCP_QUALITY,
  });
  const { srcSet, ...img } = props;
  const preloadHref = pickSrcSetCandidate(srcSet, 640) ?? img.src;

  return (
    <section className="relative flex min-h-[520px] items-start justify-center overflow-visible pb-24 sm:min-h-[580px] sm:pb-28">
      {preloadHref ? (
        <link
          rel="preload"
          as="image"
          href={preloadHref}
          fetchPriority="high"
        />
      ) : null}
      <div className="absolute inset-0 overflow-hidden">
        {/* Native img avoids next/image `priority` injecting unused preconnect /. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...img}
          srcSet={srcSet}
          alt="Tatil manzarası"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="relative z-10 w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </div>

        <div className="relative z-20 mt-8 min-h-[20.5rem] lg:min-h-[6.75rem]">
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
      <div className="mx-auto mb-1.5 h-12 max-w-xl rounded-2xl bg-white/90 shadow-lg" />
      <div className="h-[16.5rem] rounded-2xl bg-[#f5f0ea]/95 shadow-2xl lg:h-14" />
    </div>
  );
}

async function HomeHeroSearch() {
  const regions = await getHeroSearchRegions();
  return <HeroSearch regions={regions} />;
}
