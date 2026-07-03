"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutList,
  MapPin,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  deleteSurroundingCategory,
  deleteSurroundingLocation,
  moveSurroundingCategory,
  moveSurroundingLocation,
} from "@/app/actions/admin/surrounding";
import CategoryFormModal from "@/components/admin/surrounding/CategoryFormModal";
import LocationFormModal from "@/components/admin/surrounding/LocationFormModal";
import type {
  SurroundingCategoryItem,
  SurroundingLocationItem,
} from "@/lib/queries/surrounding";

interface SurroundingManagementProps {
  categories: SurroundingCategoryItem[];
  totalLocations: number;
}

export default function SurroundingManagement({
  categories,
  totalLocations,
}: SurroundingManagementProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCategories, setShowCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<
    { mode: "create" } | { mode: "edit"; category: SurroundingCategoryItem } | null
  >(null);
  const [locationModal, setLocationModal] = useState<
    | { mode: "create"; categoryId?: string }
    | { mode: "edit"; location: SurroundingLocationItem }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return categories
      .map((category) => {
        const locations = category.locations.filter((location) => {
          if (!query) return true;
          return location.name.toLocaleLowerCase("tr-TR").includes(query);
        });

        return { ...category, locations };
      })
      .filter((category) => {
        if (activeTab !== "all" && category.id !== activeTab) return false;
        if (!query) return true;
        return (
          category.name.toLocaleLowerCase("tr-TR").includes(query) ||
          category.locations.length > 0
        );
      });
  }, [categories, search, activeTab]);

  const visibleCount = filteredCategories.reduce(
    (sum, category) => sum + category.locations.length,
    0
  );

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-[180px] items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Çevre ve Konum</h1>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {totalLocations}
              </span>
            </div>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCategories((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                showCategories
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Kategoriler
            </button>
            <button
              type="button"
              onClick={() => setLocationModal({ mode: "create" })}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Konum Tipi
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {showCategories && (
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Kategori Yönetimi</h2>
              <button
                type="button"
                onClick={() => setCategoryModal({ mode: "create" })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Yeni Kategori
              </button>
            </div>

            <div className="space-y-2">
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {index + 1}. {category.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.locations.length} tip
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isPending || index === 0}
                        onClick={() =>
                          runAction(() =>
                            moveSurroundingCategory(category.id, "up")
                          )
                        }
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-white disabled:opacity-40"
                        title="Yukarı taşı"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isPending || index === categories.length - 1}
                        onClick={() =>
                          runAction(() =>
                            moveSurroundingCategory(category.id, "down")
                          )
                        }
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-white disabled:opacity-40"
                        title="Aşağı taşı"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryModal({ mode: "edit", category })
                        }
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-white"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `"${category.name}" kategorisini silmek istediğinize emin misiniz?`
                            )
                          ) {
                            return;
                          }
                          runAction(() => deleteSurroundingCategory(category.id));
                        }}
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-white disabled:opacity-40"
                        title="Sil"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                  Henüz kategori tanımlanmadı. Önce kategori ekleyin.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "all"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Tümü
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveTab(category.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === category.id
                    ? "bg-teal-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <section key={category.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    {category.name} ({category.locations.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setLocationModal({
                        mode: "create",
                        categoryId: category.id,
                      })
                    }
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    + Konum Ekle
                  </button>
                </div>

                {category.locations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {category.locations.map((location, index) => (
                      <div
                        key={location.id}
                        className="group inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm"
                      >
                        <span>{location.name}</span>
                        <div className="ml-1 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            disabled={isPending || index === 0}
                            onClick={() =>
                              runAction(() =>
                                moveSurroundingLocation(location.id, "up")
                              )
                            }
                            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              isPending || index === category.locations.length - 1
                            }
                            onClick={() =>
                              runAction(() =>
                                moveSurroundingLocation(location.id, "down")
                              )
                            }
                            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLocationModal({ mode: "edit", location })
                            }
                            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `"${location.name}" konum tipini silmek istediğinize emin misiniz?`
                                )
                              ) {
                                return;
                              }
                              runAction(() =>
                                deleteSurroundingLocation(location.id)
                              );
                            }}
                            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Bu kategoride henüz konum tipi yok.
                  </p>
                )}
              </section>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">
              {categories.length === 0
                ? "Başlamak için önce kategori tanımlayın."
                : "Arama kriterlerine uygun konum bulunamadı."}
            </div>
          )}
        </div>

        {search && (
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            {visibleCount} konum gösteriliyor
          </div>
        )}
      </div>

      {categoryModal?.mode === "create" && (
        <CategoryFormModal onClose={() => setCategoryModal(null)} />
      )}
      {categoryModal?.mode === "edit" && (
        <CategoryFormModal
          category={categoryModal.category}
          onClose={() => setCategoryModal(null)}
        />
      )}
      {locationModal?.mode === "create" && (
        <LocationFormModal
          categories={categories}
          defaultCategoryId={locationModal.categoryId}
          onClose={() => setLocationModal(null)}
        />
      )}
      {locationModal?.mode === "edit" && (
        <LocationFormModal
          categories={categories}
          location={locationModal.location}
          onClose={() => setLocationModal(null)}
        />
      )}
    </div>
  );
}
