"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  createSurroundingLocation,
  updateSurroundingLocation,
  type SurroundingActionState,
} from "@/app/actions/admin/surrounding";
import type {
  SurroundingCategoryItem,
  SurroundingLocationItem,
  SurroundingProvinceOption,
} from "@/lib/queries/surrounding";
import { useRefreshOnActionSuccess } from "@/components/admin/AdminPageRefresh";
import { parseLatLngPaste } from "@/lib/surrounding-location-helpers";

interface LocationFormModalProps {
  categories: SurroundingCategoryItem[];
  provinces: SurroundingProvinceOption[];
  location?: SurroundingLocationItem;
  defaultCategoryId?: string;
  onClose: () => void;
}

export default function LocationFormModal({
  categories,
  provinces,
  location,
  defaultCategoryId,
  onClose,
}: LocationFormModalProps) {
  const isEdit = Boolean(location);
  const action = isEdit ? updateSurroundingLocation : createSurroundingLocation;
  const [state, formAction, pending] = useActionState<
    SurroundingActionState,
    FormData
  >(action, {});

  const [latitude, setLatitude] = useState(
    location?.latitude != null ? String(location.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    location?.longitude != null ? String(location.longitude) : ""
  );
  const [pasteValue, setPasteValue] = useState("");
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>(
    location?.regionIds ?? []
  );

  useRefreshOnActionSuccess(state.success);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  function applyPaste() {
    const parsed = parseLatLngPaste(pasteValue);
    if (!parsed) return;
    setLatitude(String(parsed.latitude));
    setLongitude(String(parsed.longitude));
  }

  function toggleRegion(regionId: string) {
    setSelectedRegionIds((prev) =>
      prev.includes(regionId)
        ? prev.filter((id) => id !== regionId)
        : [...prev, regionId]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Konum Tipini Düzenle" : "Yeni Konum Tipi"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {location && <input type="hidden" name="id" value={location.id} />}
          {selectedRegionIds.map((regionId) => (
            <input key={regionId} type="hidden" name="regionIds" value={regionId} />
          ))}

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
                <span className="text-xs font-medium text-gray-500">
                  Kategori
                </span>
                <select
                  name="categoryId"
                  defaultValue={
                    location?.categoryId ?? defaultCategoryId ?? categories[0]?.id
                  }
                  required
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                  Konum Adı
                </span>
                <input
                  name="name"
                  defaultValue={location?.name}
                  required
                  placeholder="Örn. Dalaman Havalimanı"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <div>
                <span className="text-xs font-medium text-gray-500">
                  Koordinat (yapıştır)
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={pasteValue}
                    onChange={(event) => setPasteValue(event.target.value)}
                    placeholder="36.566131, 29.150035"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={applyPaste}
                    className="shrink-0 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Uygula
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-gray-500">Enlem</span>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="36.566131"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-500">Boylam</span>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="29.150035"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
                <input
                  type="checkbox"
                  name="isDefault"
                  value="true"
                  defaultChecked={location?.isDefault ?? false}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    Varsayılan (otomatik hesapla)
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Villa konumunda “Mesafeleri hesapla” bu konumları doldurur.
                  </span>
                </span>
              </label>

              <div>
                <span className="text-xs font-medium text-gray-500">
                  Listeleneceği iller
                </span>
                <p className="mt-1 text-xs text-gray-400">
                  Hiç seçilmezse tüm illerde görünür.
                </p>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-3">
                  {provinces.map((province) => (
                    <label
                      key={province.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRegionIds.includes(province.id)}
                        onChange={() => toggleRegion(province.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {province.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending || categories.length === 0}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
