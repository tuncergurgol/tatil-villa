"use client";

import type { CompanySettings } from "@prisma/client";
import {
  getHomeVillaSectionConfigs,
  type HomeVillaSectionKey,
} from "@/lib/homepage-villa-sections";

const SECTION_META: Record<
  HomeVillaSectionKey,
  { label: string; description: string }
> = {
  popular: {
    label: "Popüler Villalar",
    description: "Villa tanımında “Popüler” işaretli villalar listelenir.",
  },
  deal: {
    label: "Fırsat Villalar",
    description: "Villa tanımında “Fırsat” işaretli villalar listelenir.",
  },
  recommended: {
    label: "Önerilen Villalar",
    description: "Villa tanımında “Önerilen” işaretli villalar listelenir.",
  },
};

const FIELD_NAMES: Record<
  HomeVillaSectionKey,
  { title: string; active: string; sortMode: string }
> = {
  popular: {
    title: "homePopularTitle",
    active: "homePopularActive",
    sortMode: "homePopularSortMode",
  },
  deal: {
    title: "homeDealTitle",
    active: "homeDealActive",
    sortMode: "homeDealSortMode",
  },
  recommended: {
    title: "homeRecommendedTitle",
    active: "homeRecommendedActive",
    sortMode: "homeRecommendedSortMode",
  },
};

interface HomeVillaSectionsFieldsProps {
  settings: CompanySettings;
}

export default function HomeVillaSectionsFields({
  settings,
}: HomeVillaSectionsFieldsProps) {
  const sections = getHomeVillaSectionConfigs(settings);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Anasayfa Villa Bölümleri
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Ana sayfadaki villa vitrinlerinin başlığını, görünürlüğünü ve sıralama
          şeklini yönetin.
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => {
          const meta = SECTION_META[section.key];
          const fields = FIELD_NAMES[section.key];

          return (
            <div
              key={section.key}
              className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {meta.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name={fields.active}
                    defaultChecked={section.active}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Aktif
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block rounded-2xl border border-gray-200 bg-white px-5 py-4 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
                  <span className="text-xs font-medium text-gray-500">
                    Başlık Adı
                  </span>
                  <input
                    name={fields.title}
                    type="text"
                    defaultValue={section.title}
                    placeholder={meta.label}
                    className="mt-1.5 w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
                  />
                </label>

                <label className="block rounded-2xl border border-gray-200 bg-white px-5 py-4 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
                  <span className="text-xs font-medium text-gray-500">
                    Sıralama
                  </span>
                  <select
                    name={fields.sortMode}
                    defaultValue={section.sortMode}
                    className="mt-1.5 w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
                  >
                    <option value="showcase">Vitrin Sıra (Villa Tanım)</option>
                    <option value="random">Rastgele</option>
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
