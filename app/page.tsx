import Image from "next/image";
import HeroSearch from "@/components/HeroSearch";
import CampaignBanner from "@/components/CampaignBanner";
import VillaSection from "@/components/VillaSection";
import RegionGrid from "@/components/RegionGrid";
import WhyUs from "@/components/WhyUs";
import { siteConfig } from "@/lib/data";
import { getCampaigns } from "@/lib/queries/campaigns";
import { getRegionsWithCount } from "@/lib/queries/regions";
import {
  getDealVillas,
  getPopularVillas,
  getRecommendedVillas,
} from "@/lib/queries/villas";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [popular, deals, recommended, regions, campaigns] = await Promise.all([
    getPopularVillas(),
    getDealVillas(),
    getRecommendedVillas(),
    getRegionsWithCount(),
    getCampaigns(),
  ]);

  return (
    <>
      <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden sm:min-h-[580px]">
        <Image
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80"
          alt="Tatil manzarası"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-teal-950/60 via-teal-900/40 to-teal-950/70" />

        <div className="relative z-10 w-full px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Yeni Maceranı Keşfet
            </h1>
            <p className="mt-4 text-base text-teal-100 sm:text-lg">
              Villa · Tur · Aktivite — {siteConfig.tagline}
            </p>
          </div>

          <div className="mt-10">
            <HeroSearch />
          </div>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs text-teal-200/80 sm:text-sm">
            {siteConfig.agency} — TÜRSAB No: {siteConfig.tursabNo}
          </p>
        </div>
      </section>

      <CampaignBanner campaigns={campaigns} />

      <VillaSection
        title="Popüler Villalar"
        subtitle="Sizin için seçtiklerimiz."
        villas={popular}
        viewAllHref="/villalar?filter=popular"
      />

      <div className="bg-gray-50">
        <VillaSection
          title="Fırsat Villalar"
          subtitle="En uygun fiyatlarla tatilin keyfini çıkarın."
          villas={deals}
          viewAllHref="/villalar?filter=deal"
        />
      </div>

      <VillaSection
        title="Önerilen Villalar"
        subtitle="En çok tercih edilen villalar."
        villas={recommended}
        viewAllHref="/villalar?filter=recommended"
      />

      <RegionGrid regions={regions} />

      <WhyUs />
    </>
  );
}
