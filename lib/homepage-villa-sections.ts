import type { CompanySettings } from "@prisma/client";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { getVillas, type VillaFilters } from "@/lib/queries/villas";

export type HomeVillaSectionKey = "popular" | "deal" | "recommended";
export type HomeVillaSectionSortMode = "showcase" | "random";

export type HomeVillaSectionConfig = {
  key: HomeVillaSectionKey;
  title: string;
  active: boolean;
  sortMode: HomeVillaSectionSortMode;
};

export const HOME_VILLA_SECTION_SUBTITLES: Record<HomeVillaSectionKey, string> = {
  popular: "Sizin için seçtiklerimiz.",
  deal: "En uygun fiyatlarla tatilin keyfini çıkarın.",
  recommended: "En çok tercih edilen villalar.",
};

const SECTION_DEFAULTS: Record<
  HomeVillaSectionKey,
  { title: string; active: boolean; sortMode: HomeVillaSectionSortMode }
> = {
  popular: {
    title: "Popüler Villalar",
    active: true,
    sortMode: "showcase",
  },
  deal: {
    title: "Fırsat Villalar",
    active: true,
    sortMode: "showcase",
  },
  recommended: {
    title: "Önerilen Villalar",
    active: true,
    sortMode: "showcase",
  },
};

export function parseHomeVillaSectionSortMode(
  value: string | null | undefined
): HomeVillaSectionSortMode {
  return value === "random" ? "random" : "showcase";
}

function readSection(
  settings: CompanySettings,
  key: HomeVillaSectionKey,
  titleField: keyof CompanySettings,
  activeField: keyof CompanySettings,
  sortField: keyof CompanySettings
): HomeVillaSectionConfig {
  const defaults = SECTION_DEFAULTS[key];
  const title = String(settings[titleField] ?? "").trim() || defaults.title;
  const active = Boolean(settings[activeField] ?? defaults.active);
  const sortMode = parseHomeVillaSectionSortMode(
    String(settings[sortField] ?? defaults.sortMode)
  );

  return { key, title, active, sortMode };
}

export function getHomeVillaSectionConfigs(
  settings: CompanySettings
): HomeVillaSectionConfig[] {
  return [
    readSection(
      settings,
      "popular",
      "homePopularTitle",
      "homePopularActive",
      "homePopularSortMode"
    ),
    readSection(
      settings,
      "deal",
      "homeDealTitle",
      "homeDealActive",
      "homeDealSortMode"
    ),
    readSection(
      settings,
      "recommended",
      "homeRecommendedTitle",
      "homeRecommendedActive",
      "homeRecommendedSortMode"
    ),
  ];
}

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
