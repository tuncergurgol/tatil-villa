"use client";

import { useActionState, useEffect, useState } from "react";
import { Star, Search, X } from "lucide-react";
import {
  createAmenity,
  updateAmenity,
  type AmenityActionState,
} from "@/app/actions/admin/amenities";
import type { AmenityCategoryItem, AmenityItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";

interface AmenityFormModalProps {
  categories: AmenityCategoryItem[];
  facilityCategories: FacilityCategoryOption[];
  amenity?: AmenityItem;
  defaultCategoryId?: string;
  onClose: () => void;
}

export default function AmenityFormModal({
  categories,
  facilityCategories,
  amenity,
  defaultCategoryId,
  onClose,
}: AmenityFormModalProps) {
  const isEdit = Boolean(amenity);
  const action = isEdit ? updateAmenity : createAmenity;
  const [isDefault, setIsDefault] = useState(amenity?.isDefault ?? false);
  const [showInSearch, setShowInSearch] = useState(amenity?.showInSearch ?? false);
  const [state, formAction, pending] = useActionState<
    AmenityActionState,
    FormData
  >(action, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  const isLongTextCategory = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    return (
      category?.slug === "erisim-bilgileri" ||
      category?.slug === "yemek-hizmeti"
    );
  };

  const selectedCategoryId =
    amenity?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "";
  const useTextarea = isLongTextCategory(selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Olanak Düzenle" : "Yeni Olanak"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {amenity && <input type="hidden" name="id" value={amenity.id} />}
          <input type="hidden" name="isDefault" value={isDefault ? "true" : "false"} />
          <input type="hidden" name="showInSearch" value={showInSearch ? "true" : "false"} />

          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}

          {categories.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Önce en az bir kategori tanımlayın.
            </p>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Olanak Adı</span>
                {useTextarea ? (
                  <textarea
                    name="name"
                    defaultValue={amenity?.name}
                    required
                    rows={4}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                ) : (
                  <input
                    name="name"
                    defaultValue={amenity?.name}
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                )}
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500">Kategori</span>
                <select
                  name="categoryId"
                  defaultValue={selectedCategoryId}
                  required
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500">
                  Bağlı Olduğu Kategori
                </span>
                <select
                  name="facilityCategoryId"
                  defaultValue={amenity?.facilityCategoryId ?? ""}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Seçim yok</option>
                  {facilityCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-500">
                  Villa kategorileri listesinden seçin. Bu olanak işaretlenen
                  villalarda ilgili kategori otomatik seçilir.
                </p>
              </label>

              <label className="block cursor-pointer rounded-xl border-2 border-sky-200 bg-sky-50 p-4 transition hover:bg-sky-100/70">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-white p-2 text-sky-600 shadow-sm">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sky-900">
                      Varsayılan olarak seçili gelsin
                    </p>
                    <p className="mt-1 text-sm text-sky-700">
                      Yeni villa eklenirken bu olanak otomatik işaretli gelir.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                  />
                </div>
              </label>

              <label className="block cursor-pointer rounded-xl border-2 border-teal-200 bg-teal-50 p-4 transition hover:bg-teal-100/70">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-white p-2 text-teal-600 shadow-sm">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-teal-900">
                      Detaylı aramada listelensin
                    </p>
                    <p className="mt-1 text-sm text-teal-700">
                      İşaretlenirse villalar arama sayfasındaki Olanaklar
                      filtresinde görünür.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showInSearch}
                    onChange={(e) => setShowInSearch(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                  />
                </div>
              </label>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">
              İptal
            </button>
            <button
              type="submit"
              disabled={pending || categories.length === 0}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
