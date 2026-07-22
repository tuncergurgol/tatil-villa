import type { CompanySettings } from "@prisma/client";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { getVillas, type VillaFilters } from "@/lib/queries/villas";
import {
  getHomeVillaSectionConfigs,
  type HomeVillaSectionConfig,
} from "@/lib/homepage-villa-sections-config";

export type {
  HomeVillaSectionConfig,
  HomeVillaSectionKey,
  HomeVillaSectionSortMode,
} from "@/lib/homepage-villa-sections-config";
export {
  HOME_VILLA_SECTION_SUBTITLES,
  getHomeVillaSectionConfigs,
  parseHomeVillaSectionSortMode,
} from "@/lib/homepage-villa-sections-config";

function filtersForSection(
  section: HomeVillaSectionConfig,
  siteKey: PublicSiteKey
): VillaFilters {
  return {
    filter: section.key,
    limit: 12,
    siteKey,
    sort: section.sortMode === "random" ? "random" : undefined,
  };
}

export type HomeVillaSectionWithVillas = HomeVillaSectionConfig & {
  villas: Awaited<ReturnType<typeof getVillas>>;
};

export async function getHomeVillaSectionsWithData(
  settings: CompanySettings,
  siteKey: PublicSiteKey
): Promise<HomeVillaSectionWithVillas[]> {
  const configs = getHomeVillaSectionConfigs(settings).filter(
    (section) => section.active
  );

  const sections = await Promise.all(
    configs.map(async (section) => ({
      ...section,
      villas: await getVillas(filtersForSection(section, siteKey)),
    }))
  );

  return sections.filter((section) => section.villas.length > 0);
}
