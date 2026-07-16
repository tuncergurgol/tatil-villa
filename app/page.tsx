import Image from "next/image";
import HeroSearch from "@/components/HeroSearch";
import CampaignBanner from "@/components/CampaignBanner";
import VillaSection from "@/components/VillaSection";
import DreamVacationSection from "@/components/DreamVacationSection";
import RegionGrid from "@/components/RegionGrid";
import TravelAdventureSection from "@/components/villa-detail/TravelAdventureSection";
import { getCampaigns } from "@/lib/queries/campaigns";
import { getRegionsWithCount, getHeroSearchRegions } from "@/lib/queries/regions";
import { getHomeDreamCategories } from "@/lib/queries/facility-categories";
import {
  getDealVillas,
  getPopularVillas,
  getRecommendedVillas,
} from "@/lib/queries/villas";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    popular,
    deals,
    recommended,
    regions,
    campaigns,
    searchRegions,
    dreamCards,
  ] = await Promise.all([
    getPopularVillas(),
    getDealVillas(),
    getRecommendedVillas(),
    getRegionsWithCount(),
    getCampaigns(),
    getHeroSearchRegions(),
    getHomeDreamCategories(),
  ]);

  return (
    <>
      <section className="relative flex min-h-[520px] items-center justify-center overflow-visible pb-24 sm:min-h-[580px] sm:pb-28">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80"
            alt="Tatil manzarası"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>

        <div className="relative z-10 w-full px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
              Yeni Maceranı Keşfet
            </h1>
          </div>

          <div className="relative z-20 mt-8">
            <HeroSearch regions={searchRegions} />
          </div>
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

      <DreamVacationSection cards={dreamCards} />

      <RegionGrid regions={regions} />

      <section
        id="seyahat-macerasi"
        className="border-t border-slate-100 bg-white py-12 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TravelAdventureSection />
        </div>
      </section>
    </>
  );
}
