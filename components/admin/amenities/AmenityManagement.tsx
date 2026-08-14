"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LayoutList,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  deleteAmenity,
  deleteAmenityCategory,
  toggleAmenityDefault,
  toggleAmenityShowInSearch,
} from "@/app/actions/admin/amenities";
import AmenityCategoryFormModal from "@/components/admin/amenities/AmenityCategoryFormModal";
import AmenityFormModal from "@/components/admin/amenities/AmenityFormModal";
import type { AmenityCategoryItem, AmenityItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";
import { includesSearchText } from "@/lib/search-text";

interface AmenityManagementProps {
  categories: AmenityCategoryItem[];
  facilityCategories: FacilityCategoryOption[];
  totalAmenities: number;
  defaultCount: number;
  searchCount: number;
}

function isLongTextAmenity(name: string) {
  return name.length > 48;
}

export default function AmenityManagement({
  categories,
  facilityCategories,
  totalAmenities,
  defaultCount,
  searchCount,
}: AmenityManagementProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<
    { mode: "create" } | { mode: "edit"; category: AmenityCategoryItem } | null
  >(null);
  const [amenityModal, setAmenityModal] = useState<
    | { mode: "create"; categoryId?: string }
    | { mode: "edit"; amenity: AmenityItem }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => {
        const amenities = category.amenities.filter((amenity) =>
          includesSearchText(amenity.name, search)
        );
        return { ...category, amenities };
      })
      .filter((category) => {
        if (activeTab !== "all" && category.id !== activeTab) return false;
        if (!search.trim()) return true;
        return (
          includesSearchText(category.name, search) ||
          category.amenities.length > 0
        );
      });
  }, [categories, search, activeTab]);

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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Ev Olanakları</h1>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {totalAmenities}
              </span>
            </div>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCategories((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                showCategories
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Kategoriler
            </button>
            <button
              type="button"
              onClick={() => setAmenityModal({ mode: "create" })}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Olanak
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 bg-sky-50/60 px-5 py-2 text-xs text-sky-800">
          <Star className="mr-1 inline h-3.5 w-3.5 fill-current" />
          {defaultCount} varsayılan olanak — yeni villa eklerken otomatik seçilir
          <span className="mx-2 text-sky-300">·</span>
          <Search className="mr-1 inline h-3.5 w-3.5" />
          {searchCount} olanak detaylı aramada listeleniyor
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Yeni Kategori
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">
                      {category.amenities.length} olanak
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setCategoryModal({ mode: "edit", category })} className="rounded-lg border p-2"><Pencil className="h-4 w-4" /></button>
                    <button type="button" disabled={isPending} onClick={() => { if (window.confirm(`"${category.name}" silinsin mi?`)) runAction(() => deleteAmenityCategory(category.id)); }} className="rounded-lg border p-2 disabled:opacity-40"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveTab("all")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeTab === "all" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>Tümü</button>
            {categories.map((category) => (
              <button key={category.id} type="button" onClick={() => setActiveTab(category.id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeTab === category.id ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{category.name}</button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {filteredCategories.map((category) => (
            <section key={category.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  {category.name} ({category.amenities.length})
                </h3>
                <button type="button" onClick={() => setAmenityModal({ mode: "create", categoryId: category.id })} className="text-sm font-medium text-indigo-600">+ Olanak Ekle</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.amenities.map((amenity) => {
                  const longText = isLongTextAmenity(amenity.name);
                  return (
                    <div
                      key={amenity.id}
                      className={`group inline-flex items-start gap-1 rounded-xl border px-3 py-2 text-sm shadow-sm ${
                        longText ? "w-full max-w-3xl" : ""
                      } ${
                        amenity.isDefault
                          ? "border-sky-400 bg-sky-50 font-semibold text-sky-800 ring-1 ring-sky-200"
                          : amenity.showInSearch
                            ? "border-teal-300 bg-teal-50/70 font-medium text-teal-900"
                            : "border-gray-200 bg-white text-gray-800"
                      }`}
                    >
                      {amenity.isDefault && (
                        <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-sky-500 text-sky-500" />
                      )}
                      {amenity.showInSearch && !amenity.isDefault && (
                        <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                      )}
                      <span className={longText ? "flex-1 leading-relaxed" : ""}>{amenity.name}</span>
                      {amenity.facilityCategory?.name && (
                        <span className="ml-1 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                          {amenity.facilityCategory.name}
                        </span>
                      )}
                      <div className="ml-1 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button type="button" title="Varsayılan" disabled={isPending} onClick={() => runAction(() => toggleAmenityDefault(amenity.id))} className={`rounded p-0.5 ${amenity.isDefault ? "text-sky-600" : "text-gray-400 hover:text-sky-600"}`}><Star className="h-3.5 w-3.5" /></button>
                        <button type="button" title="Detaylı aramada göster" disabled={isPending} onClick={() => runAction(() => toggleAmenityShowInSearch(amenity.id))} className={`rounded p-0.5 ${amenity.showInSearch ? "text-teal-600" : "text-gray-400 hover:text-teal-600"}`}><Search className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setAmenityModal({ mode: "edit", amenity })} className="rounded p-0.5 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={isPending} onClick={() => { if (window.confirm(`"${amenity.name}" silinsin mi?`)) runAction(() => deleteAmenity(amenity.id)); }} className="rounded p-0.5 text-gray-400 disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {categoryModal?.mode === "create" && <AmenityCategoryFormModal onClose={() => setCategoryModal(null)} />}
      {categoryModal?.mode === "edit" && <AmenityCategoryFormModal category={categoryModal.category} onClose={() => setCategoryModal(null)} />}
      {amenityModal?.mode === "create" && <AmenityFormModal categories={categories} facilityCategories={facilityCategories} defaultCategoryId={amenityModal.categoryId} onClose={() => setAmenityModal(null)} />}
      {amenityModal?.mode === "edit" && <AmenityFormModal categories={categories} facilityCategories={facilityCategories} amenity={amenityModal.amenity} onClose={() => setAmenityModal(null)} />}
    </div>
  );
}
