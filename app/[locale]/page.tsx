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
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  getHomeVillaSectionsWithData,
  HOME_VILLA_SECTION_SUBTITLES,
} from "@/lib/homepage-villa-sections";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  const [homeVillaSections, regions, campaigns, searchRegions, dreamCards] =
    await Promise.all([
      getHomeVillaSectionsWithData(company, site.key),
      getRegionsWithCount(site.key, { mode: "home" }),
      getCampaigns(),
      getHeroSearchRegions(),
      getHomeDreamCategories(site.key),
    ]);

  return (
    <>
      <section className="relative flex min-h-[520px] items-center justify-center overflow-visible pb-24 sm:min-h-[580px] sm:pb-28">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={site.heroImageUrl}
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
              {site.heroTitle}
            </h1>
          </div>

          <div className="relative z-20 mt-8">
            <HeroSearch regions={searchRegions} />
          </div>
        </div>
      </section>

      <CampaignBanner campaigns={campaigns} />

      {homeVillaSections.map((section) => {
        const content = (
          <VillaSection
            title={section.title}
            subtitle={HOME_VILLA_SECTION_SUBTITLES[section.key]}
            villas={section.villas}
            viewAllHref={`/villalar?filter=${section.key}`}
          />
        );

        if (section.key === "deal") {
          return (
            <div key={section.key} className="bg-gray-50">
              {content}
            </div>
          );
        }

        return <div key={section.key}>{content}</div>;
      })}

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
