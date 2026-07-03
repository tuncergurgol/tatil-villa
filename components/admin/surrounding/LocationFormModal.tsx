"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import {
  createSurroundingLocation,
  updateSurroundingLocation,
  type SurroundingActionState,
} from "@/app/actions/admin/surrounding";
import type {
  SurroundingCategoryItem,
  SurroundingLocationItem,
} from "@/lib/queries/surrounding";

interface LocationFormModalProps {
  categories: SurroundingCategoryItem[];
  location?: SurroundingLocationItem;
  defaultCategoryId?: string;
  onClose: () => void;
}

export default function LocationFormModal({
  categories,
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

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
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
