import { getLocale, getTranslations } from "next-intl/server";
import CampaignBanner from "@/components/CampaignBanner";
import VillaSection from "@/components/VillaSection";
import DreamVacationSection from "@/components/DreamVacationSection";
import RegionGrid from "@/components/RegionGrid";
import TravelAdventureSection from "@/components/villa-detail/TravelAdventureSection";
import { getCampaigns } from "@/lib/queries/campaigns";
import { getRegionsWithCount } from "@/lib/queries/regions";
import { getHomeDreamCategories } from "@/lib/queries/facility-categories";
import {
  getHomeVillaSectionsWithData,
  HOME_VILLA_SECTION_SUBTITLES,
} from "@/lib/homepage-villa-sections";
import type { CompanySettings } from "@prisma/client";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import type { HomeVillaSectionKey } from "@/lib/homepage-villa-sections-config";

const SECTION_TITLE_KEYS: Record<
  HomeVillaSectionKey,
  { title: "sectionPopularTitle" | "sectionDealTitle" | "sectionRecommendedTitle"; subtitle: "sectionPopularSubtitle" | "sectionDealSubtitle" | "sectionRecommendedSubtitle" }
> = {
  popular: {
    title: "sectionPopularTitle",
    subtitle: "sectionPopularSubtitle",
  },
  deal: {
    title: "sectionDealTitle",
    subtitle: "sectionDealSubtitle",
  },
  recommended: {
    title: "sectionRecommendedTitle",
    subtitle: "sectionRecommendedSubtitle",
  },
};

export default async function HomeBelowFold({
  company,
  siteKey,
}: {
  company: CompanySettings;
  siteKey: PublicSiteKey;
}) {
  const [locale, tHome, homeVillaSections, regions, campaigns, dreamCards] =
    await Promise.all([
      getLocale(),
      getTranslations("home"),
      getHomeVillaSectionsWithData(company, siteKey),
      getRegionsWithCount(siteKey, { mode: "home" }),
      getCampaigns(),
      getHomeDreamCategories(siteKey),
    ]);

  return (
    <>
      <CampaignBanner campaigns={campaigns} />

      {homeVillaSections.map((section) => {
        const keys = SECTION_TITLE_KEYS[section.key];
        const title =
          locale === "tr" ? section.title : tHome(keys.title);
        const subtitle =
          locale === "tr"
            ? HOME_VILLA_SECTION_SUBTITLES[section.key]
            : tHome(keys.subtitle);
        const content = (
          <VillaSection
            title={title}
            subtitle={subtitle}
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
