import type { CompanySettings } from "@prisma/client";

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
